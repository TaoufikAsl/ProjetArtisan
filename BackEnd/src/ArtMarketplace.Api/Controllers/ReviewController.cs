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

    // POST /api/review  { productId, rating, comment }
    [Authorize(Roles = "Client")]
    [HttpPost]
    public async Task<ActionResult<Review>> Create([FromBody] CreateReviewDto dto, CancellationToken ct)
    {
        if (dto is null || dto.ProductId <= 0) return BadRequest("productId requis.");
        if (dto.Rating < 1 || dto.Rating > 5) return BadRequest("rating doit être entre 1 et 5.");

        var product = await _ctx.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
        if (product == null) return NotFound("Produit introuvable.");

        var clientId = GetUserId();
        if (clientId is null) return Unauthorized();

        // Client doit avoir commande LIVRÉE pour ce produit
        var hasDeliveredOrder = await _ctx.Orders.AsNoTracking().AnyAsync(o =>
            o.ProductId == dto.ProductId &&
            o.ClientId == clientId.Value &&
            o.Status == "Delivered", ct);

        if (!hasDeliveredOrder)
            return BadRequest("Vous pouvez noter un produit seulement après l'avoir reçu.");

        // un avis par client/produit
        var already = await _ctx.Reviews.AnyAsync(r =>
            r.ProductId == dto.ProductId && r.ClientId == clientId.Value, ct);
        if (already) return BadRequest("Vous avez déjà laissé un avis pour ce produit.");

        var review = new Review
        {
            ProductId = dto.ProductId,
            ClientId = clientId.Value,
            Rating = dto.Rating,
            Comment = dto.Comment?.Trim(),
            CreatedAt = DateTime.UtcNow 
        };

        _ctx.Reviews.Add(review);
        await _ctx.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(ForProduct), new { productId = dto.ProductId }, review);
    }

    // GET /api/review/artisan
    [Authorize(Roles = "Artisan")]
    [HttpGet("artisan")]
    public async Task<ActionResult<IEnumerable<object>>> ForArtisan(CancellationToken ct)
    {
        var artisanId = GetUserId();
        if (artisanId is null) return Unauthorized();

        // ✅ Utiliser une projection pour éviter les cycles
        var reviews = await _ctx.Reviews
            .Where(r => r.Product.ArtisanId == artisanId.Value)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                r.ClientId,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.ArtisanResponse,
                r.ArtisanResponseDate,
                // ✅ Sélectionner seulement les données nécessaires du produit
                Product = new
                {
                    r.Product.Id,
                    r.Product.Title
                },
                // ✅ Sélectionner seulement les données nécessaires du client
                Client = new
                {
                    r.Client.Id,
                    r.Client.Username
                }
            })
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return Ok(reviews);
    }

    // ✅ POST /api/review/{id}/response - Ajouter réponse artisan
    [Authorize(Roles = "Artisan")]
    [HttpPost("{reviewId:int}/response")]
    public async Task<ActionResult<Review>> AddResponse(int reviewId, [FromBody] ArtisanResponseDto dto, CancellationToken ct)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Response))
            return BadRequest("Réponse requise.");

        var artisanId = GetUserId();
        if (artisanId is null) return Unauthorized();

        // Vérifier que l'avis existe et appartient à l'artisan
        var review = await _ctx.Reviews
            .Include(r => r.Product)
            .FirstOrDefaultAsync(r => r.Id == reviewId, ct);

        if (review == null) return NotFound("Avis introuvable.");

        if (review.Product.ArtisanId != artisanId.Value)
            return Forbid("Vous ne pouvez répondre qu'aux avis de vos produits.");

        // ✅ CORRECTION : Vérifier plus précisément s'il y a déjà une réponse
        var hasExistingResponse = !string.IsNullOrWhiteSpace(review.ArtisanResponse);

        if (hasExistingResponse)
        {
            // ✅ LOG pour débugger
            Console.WriteLine($"🔍 Review {reviewId} a déjà une réponse: '{review.ArtisanResponse}'");
            return BadRequest("Vous avez déjà répondu à cet avis. Utilisez PUT pour modifier votre réponse.");
        }

        // ✅ LOG pour débugger
        Console.WriteLine($"✅ Ajout de réponse pour review {reviewId}: '{dto.Response}'");

        // Ajouter la réponse
        review.ArtisanResponse = dto.Response.Trim();
        review.ArtisanResponseDate = DateTime.UtcNow;

        await _ctx.SaveChangesAsync(ct);

        return Ok(review);
    }

    // ✅ Endpoint universel pour créer OU modifier une réponse (SANS cycles)
    [Authorize(Roles = "Artisan")]
    [HttpPut("{reviewId:int}/response/upsert")]
    public async Task<ActionResult<object>> UpsertResponse(int reviewId, [FromBody] ArtisanResponseDto dto, CancellationToken ct)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Response))
            return BadRequest("Réponse requise.");

        var artisanId = GetUserId();
        if (artisanId is null) return Unauthorized();

        var review = await _ctx.Reviews
            .Include(r => r.Product)
            .FirstOrDefaultAsync(r => r.Id == reviewId, ct);

        if (review == null) return NotFound("Avis introuvable.");

        if (review.Product.ArtisanId != artisanId.Value)
            return Forbid("Vous ne pouvez répondre qu'aux avis de vos produits.");

        // ✅ Créer OU modifier la réponse
        review.ArtisanResponse = dto.Response.Trim();
        review.ArtisanResponseDate = DateTime.UtcNow;

        await _ctx.SaveChangesAsync(ct);

        // ✅ Retourner seulement les données nécessaires (SANS cycles)
        var result = new
        {
            review.Id,
            review.ProductId,
            review.ClientId,
            review.Rating,
            review.Comment,
            review.CreatedAt,
            review.ArtisanResponse,
            review.ArtisanResponseDate,
            Product = new
            {
                review.Product.Id,
                review.Product.Title
            }
        };

        return Ok(result);
    }

    // ✅ DELETE /api/review/{id}/response - Supprimer réponse artisan
    [Authorize(Roles = "Artisan")]
    [HttpDelete("{reviewId:int}/response")]
    public async Task<ActionResult> DeleteResponse(int reviewId, CancellationToken ct)
    {
        var artisanId = GetUserId();
        if (artisanId is null) return Unauthorized();

        // Vérifier que l'avis existe et appartient à l'artisan
        var review = await _ctx.Reviews
            .Include(r => r.Product)
            .FirstOrDefaultAsync(r => r.Id == reviewId, ct);

        if (review == null) return NotFound("Avis introuvable.");
        
        if (review.Product.ArtisanId != artisanId.Value)
            return Forbid("Vous ne pouvez supprimer que vos réponses.");

        if (string.IsNullOrWhiteSpace(review.ArtisanResponse))
            return BadRequest("Aucune réponse à supprimer.");

        // Supprimer la réponse
        review.ArtisanResponse = null;
        review.ArtisanResponseDate = null;

        await _ctx.SaveChangesAsync(ct);

        return NoContent();
    }

    
    private int? GetUserId()
    {
        var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(v, out var id) ? id : null;
    }
}

// ✅ DTOs
public sealed record CreateReviewDto(int ProductId, int Rating, string? Comment);
public sealed record ArtisanResponseDto(string Response);