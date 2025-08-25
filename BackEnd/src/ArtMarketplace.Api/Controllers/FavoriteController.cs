using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Client")]
public class FavoriteController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public FavoriteController(AppDbContext ctx) => _ctx = ctx;

    private int? GetUserId()
    {
        var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(v, out var id) ? id : null;
    }

    // GET /api/favorite/ids  -> [1,4,9]
    [HttpGet("ids")]
    public async Task<ActionResult<IEnumerable<int>>> GetIds(CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid is null) return Unauthorized();

        var ids = await _ctx.Favorites.AsNoTracking()
            .Where(f => f.ClientId == uid)
            .Select(f => f.ProductId)
            .ToListAsync(ct);

        return Ok(ids);
    }

    // GET /api/favorite  -> produits favoris
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts(CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid is null) return Unauthorized();

        var products = await _ctx.Favorites.AsNoTracking()
            .Where(f => f.ClientId == uid)
            .OrderByDescending(f => f.CreatedAt)
            .Join(_ctx.Products.AsNoTracking(), f => f.ProductId, p => p.Id, (f, p) => p)
            .ToListAsync(ct);

        return Ok(products);
    }

    // POST /api/favorite/{productId}
    [HttpPost("{productId:int}")]
    public async Task<IActionResult> Add(int productId, CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid is null) return Unauthorized();

        var exists = await _ctx.Favorites.AnyAsync(f => f.ClientId == uid && f.ProductId == productId, ct);
        if (exists) return NoContent();

        var productExists = await _ctx.Products.AnyAsync(p => p.Id == productId, ct);
        if (!productExists) return NotFound("Produit introuvable.");

        _ctx.Favorites.Add(new Favorite { ClientId = uid.Value, ProductId = productId });
        await _ctx.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/favorite/{productId}
    [HttpDelete("{productId:int}")]
    public async Task<IActionResult> Remove(int productId, CancellationToken ct)
    {
        var uid = GetUserId();
        if (uid is null) return Unauthorized();

        var fav = await _ctx.Favorites.FirstOrDefaultAsync(f => f.ClientId == uid && f.ProductId == productId, ct);
        if (fav == null) return NoContent();

        _ctx.Favorites.Remove(fav);
        await _ctx.SaveChangesAsync(ct);
        return NoContent();
    }
}
