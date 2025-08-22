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

    // Lecture publique pour le catalogue
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] string? q,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);

        IQueryable<Product> query = _context.Products
            .AsNoTracking()
            .Include(p => p.Artisan)
            .OrderByDescending(p => p.Id);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(p =>
                p.Title.Contains(term) ||
                (p.Description != null && p.Description.Contains(term)));
        }

        var products = await query.Skip(skip).Take(take).ToListAsync(ct);
        return Ok(products);
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Product>> GetById(int id, CancellationToken ct = default)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Artisan)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (product == null) return NotFound();
        return Ok(product);
    }

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

    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out userId) && userId > 0;
    }
}
