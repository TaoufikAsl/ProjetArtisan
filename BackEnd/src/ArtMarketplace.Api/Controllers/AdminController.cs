using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Security.Claims; // ⬅️ pour lire l'id connecté

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _ctx;
    public AdminController(AppDbContext ctx) => _ctx = ctx;

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(CancellationToken ct)
    {
        var users = await _ctx.Users
            .AsNoTracking()
            .Select(u => new AdminUserDto(u.Id, u.Username, u.Role))
            .ToListAsync(ct);

        return Ok(users);
    }

    // POST /api/admin/users  { username, password, role }
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.Role))
            return BadRequest("username, password, role requis.");

        var exists = await _ctx.Users.AnyAsync(u => u.Username == dto.Username, ct);
        if (exists) return BadRequest("Ce nom d'utilisateur est déjà pris.");

        using var hmac = new HMACSHA512();
        var user = new User
        {
            Username = dto.Username.Trim(),
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
            PasswordSalt = hmac.Key,
            Role = dto.Role.Trim()
        };

        _ctx.Users.Add(user);
        await _ctx.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetUsers), new { id = user.Id }, new AdminUserDto(user.Id, user.Username, user.Role));
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id, CancellationToken ct)
    {
        var meIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = int.TryParse(meIdStr, out var meId);

        var u = await _ctx.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null) return NotFound();

        // Empêcher de se supprimer soi-même
        if (id == meId) return BadRequest("Vous ne pouvez pas vous supprimer vous-même.");

        // Empêcher de supprimer le dernier Admin
        if (u.Role == "Admin")
        {
            var otherAdmins = await _ctx.Users.CountAsync(x => x.Role == "Admin" && x.Id != id, ct);
            if (otherAdmins == 0)
                return BadRequest("Impossible de supprimer le dernier administrateur.");
        }

        // Vérif de liens (évite orphelins si pas de cascade)
        var hasProducts = await _ctx.Products.AnyAsync(p => p.ArtisanId == id, ct);
        var hasOrdersAsClient = await _ctx.Orders.AnyAsync(o => o.ClientId == id, ct);
        var hasOrdersAsArtisan = await _ctx.Orders.AnyAsync(o => o.ArtisanId == id, ct);
        var hasOrdersAsDp = await _ctx.Orders.AnyAsync(o => o.DeliveryPartnerId == id, ct);
        var hasReviews = await _ctx.Reviews.AnyAsync(r => r.ClientId == id, ct);

        if (hasProducts || hasOrdersAsClient || hasOrdersAsArtisan || hasOrdersAsDp || hasReviews)
            return Conflict("Suppression impossible: l’utilisateur a des données liées (produits/commandes/avis).");

        _ctx.Users.Remove(u);
        await _ctx.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record AdminUserDto(int Id, string Username, string Role);
public sealed record AdminCreateUserDto(string Username, string Password, string Role);
