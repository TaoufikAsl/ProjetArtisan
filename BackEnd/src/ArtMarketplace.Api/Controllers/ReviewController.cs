using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public ReviewController(AppDbContext ctx) => _ctx = ctx;

    // GET /api/review/product/{productId}
    [AllowAnonymous]
    [HttpGet("product/{productId:int}")]
    public async Task<ActionResult<IEnumerable<Review>>> ForProduct(int productId, CancellationToken ct)
    {
        var exists = await _ctx.Products.AnyAsync(p => p.Id == productId, ct);
        if (!exists) return NotFound("Produit introuvable.");
        var list = await _ctx.Reviews.AsNoTracking()
            .Where(r => r.ProductId == productId)
            .OrderByDescending(r => r.Id)
            .ToListAsync(ct);
        return Ok(list);
    }

    // POST /api/review  {productId, rating, comment}
    [Authorize(Roles = "Client")]
    [HttpPost]
    public async Task<ActionResult<Review>> Create([FromBody] CreateReviewDto dto, CancellationToken ct)
    {
        if (dto is null || dto.ProductId <= 0) return BadRequest("productId requis.");
        if (dto.Rating < 1 || dto.Rating > 5) return BadRequest("rating doit être entre 1 et 5.");

        var product = await _ctx.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
        if (product == null) return NotFound("Produit introuvable.");

        var clientId = GetUserId();
        if (clientId is null) return Unauthorized();

        // (optionnel) empêcher les doublons par client/produit
        var already = await _ctx.Reviews.AnyAsync(r => r.ProductId == dto.ProductId && r.ClientId == clientId, ct);
        if (already) return BadRequest("Vous avez déjà laissé un avis pour ce produit.");

        var review = new Review
        {
            ProductId = dto.ProductId,
            ClientId = clientId.Value,
            Rating = dto.Rating,
            Comment = dto.Comment?.Trim()
        };

        _ctx.Reviews.Add(review);
        await _ctx.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(ForProduct), new { productId = dto.ProductId }, review);
    }

    // GET /api/review/artisan
    [Authorize(Roles = "Artisan")]
    [HttpGet("artisan")]
    public async Task<ActionResult<IEnumerable<Review>>> ForArtisan(CancellationToken ct)
    {
        var artisanId = GetUserId();
        if (artisanId is null) return Unauthorized();

        var reviews = await _ctx.Reviews
            .Include(r => r.Product)
            .Include(r => r.Client)
            .Where(r => r.Product.ArtisanId == artisanId.Value)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return Ok(reviews);
    }

    private int? GetUserId()
    {
        var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(v, out var id) ? id : null;
    }
}

public sealed record CreateReviewDto(int ProductId, int Rating, string? Comment);
