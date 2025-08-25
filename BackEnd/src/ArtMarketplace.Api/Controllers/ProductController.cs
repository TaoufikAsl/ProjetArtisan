using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductController(AppDbContext context)
    {
        _context = context;
    }

    //Retourne les produits approuvés uniquement
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> List(
        [FromQuery] string? q = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] int? artisanId = null, // ✅ Ajouter ce paramètre
        [FromQuery] string sort = "recent",
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var query = _context.Products.AsNoTracking()
            .Include(p => p.Artisan) 
            .AsQueryable();


        if (artisanId.HasValue)
            query = query.Where(p => p.ArtisanId == artisanId.Value);


        var products = await query
            .Skip(skip)
            .Take(take)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Description,
                p.Price,
                p.ImageUrl,
                p.ArtisanId,
                p.Category,
                p.CreatedAt,
                p.UpdatedAt,
                Artisan = new
                {
                    p.Artisan.Id,
                    p.Artisan.Username
                }
            })
            .ToListAsync(ct);

        return Ok(products);
    }


    // endpoint pour récupérer la liste des artisans
    [AllowAnonymous]
    [HttpGet("artisans")]
    public async Task<ActionResult<IEnumerable<object>>> GetArtisans(CancellationToken ct)
    {
        var artisans = await _context.Users
            .Where(u => u.Role == "Artisan")
            .Select(u => new
            {
                u.Id,
                u.Username
            })
            .OrderBy(u => u.Username)
            .ToListAsync(ct);

        return Ok(artisans);
    }
    // Détail : visible si approuvé, ou si Admin, ou si Artisan propriétaire
    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Product>> GetById(int id, CancellationToken ct = default)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Artisan)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return NotFound();

        if (product.IsApproved) return Ok(product);
        if (User.IsInRole("Admin")) return Ok(product);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(userIdClaim, out var uid) && uid == product.ArtisanId) return Ok(product);

        return NotFound();
    }

    //  Espace ARTISAN

    [Authorize(Roles = "Artisan")]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<Product>>> GetMine(CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        var products = await _context.Products
            .AsNoTracking()
            .Where(p => p.ArtisanId == userId)
            .OrderByDescending(p => p.Id)
            .ToListAsync(ct);

        return Ok(products);
    }

    [Authorize(Roles = "Artisan")]
    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] Product product, CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();

        product.Id = 0;
        product.ArtisanId = userId;
        product.IsApproved = false; // en attente de modération

        _context.Products.Add(product);
        await _context.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [Authorize(Roles = "Artisan")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] Product updatedProduct, CancellationToken ct = default)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return NotFound();

        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (product.ArtisanId != userId) return Forbid();

        product.Title = updatedProduct.Title;
        product.Description = updatedProduct.Description;
        product.Price = updatedProduct.Price;
        product.ImageUrl = updatedProduct.ImageUrl;


        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize(Roles = "Artisan")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product == null) return NotFound();

        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (product.ArtisanId != userId) return Forbid();

        _context.Products.Remove(product);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    
    //  ADMIN — MODÉRATION
  

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/pending")]
    public async Task<ActionResult<IEnumerable<Product>>> GetPending(CancellationToken ct = default)
    {
        var list = await _context.Products
            .AsNoTracking()
            .Include(p => p.Artisan)
            .Where(p => !p.IsApproved)
            .OrderByDescending(p => p.Id)
            .ToListAsync(ct);

        return Ok(list);
    }


    [Authorize(Roles = "Admin")]
    [HttpGet("pending/count")]
    public async Task<IActionResult> GetPendingCount(CancellationToken ct)
    {
        var count = await _context.Products.CountAsync(p => !p.IsApproved, ct);
        return Ok(new { count });
    }


    // Approuver un produit
    [Authorize(Roles = "Admin")]
    [HttpPut("admin/{id:int}/approve")]
    public async Task<IActionResult> Approve(int id, CancellationToken ct = default)
    {
        var p = await _context.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return NotFound();

        p.IsApproved = true;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    // Supprimer un produit (admin)
    [Authorize(Roles = "Admin")]
    [HttpDelete("admin/{id:int}")]
    public async Task<IActionResult> AdminDelete(int id, CancellationToken ct = default)
    {
        var p = await _context.Products.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return NotFound();

        _context.Products.Remove(p);
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    // =========================

    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out userId) && userId > 0;
    }
}
