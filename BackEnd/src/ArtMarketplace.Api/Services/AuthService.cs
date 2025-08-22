using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.DTOs;
using ArtMarketplace.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ArtMarketplace.Api.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }


    public async Task<string?> LoginAsync(UserLoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null || !VerifyPassword(dto.Password, user.PasswordHash, user.PasswordSalt))
            return null;

        return GenerateJwtToken(user.Id.ToString(), user.Username, user.Role);
    }

    public async Task<bool> UserExistsAsync(string username)
    {
        return await _context.Users.AnyAsync(u => u.Username == username);
    }

    public async Task CreateUserAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

  

    private bool VerifyPassword(string password, byte[] hash, byte[] salt)
    {
        using var hmac = new HMACSHA512(salt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return computedHash.SequenceEqual(hash);
    }

    
    //   JWT
   

    private string GenerateJwtToken(string userId, string username, string role)
    {
        var key = _config["Jwt:Key"]!;
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var expiresMinutes = int.TryParse(_config["Jwt:ExpiresMinutes"], out var m) ? m : 60;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.UniqueName, username),
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, username),
            new(ClaimTypes.Role, role)
        };

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
