using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    public UploadController(IWebHostEnvironment env) => _env = env;

    // POST /api/upload/image
    [Authorize(Roles = "Artisan,Admin")]
    [HttpPost("image")]
    [RequestSizeLimit(5_000_000)]                 // 5 Mo
    [Consumes("multipart/form-data")]             // ✅ important pour Swagger
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest("Fichier manquant.");

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext)) return BadRequest("Formats autorisés: jpg, jpeg, png, webp.");
        if (file.Length > 5_000_000) return BadRequest("Fichier trop volumineux (max 5 Mo).");

        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploads = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploads);

        var fname = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(uploads, fname);
        await using (var fs = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(fs, ct);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/uploads/{fname}";
        return Ok(new { url });
    }
}
