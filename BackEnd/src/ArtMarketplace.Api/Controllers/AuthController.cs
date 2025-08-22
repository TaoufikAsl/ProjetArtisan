using ArtMarketplace.Api.Services;
using ArtMarketplace.Domain.DTOs;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto dto)
    {
        var token = await _authService.LoginAsync(dto);

        if (token == null)
            return Unauthorized("Nom d'utilisateur ou mot de passe invalide");

        return Ok(new { token });


    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var username = User.Identity?.Name;
        var role = User.Claims.FirstOrDefault(c =>
            c.Type == System.Security.Claims.ClaimTypes.Role
            || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;

        return Ok(new { username, role });
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto dto)
    {
        // Vérifie si l'utilisateur existe déjà
        var exists = await _authService.UserExistsAsync(dto.Username);
        if (exists)
            return BadRequest("Ce nom d'utilisateur est déjà pris.");

        // Crée le hachage et le salt
        using var hmac = new HMACSHA512();
        var user = new User
        {
            Username = dto.Username,
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
            PasswordSalt = hmac.Key,
            Role = dto.Role
        };

        await _authService.CreateUserAsync(user);
        return Ok("Utilisateur créé avec succès !");
    }
}
