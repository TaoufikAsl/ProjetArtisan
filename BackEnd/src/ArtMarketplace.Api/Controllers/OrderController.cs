using ArtMarketplace.Data.Contexts;
using ArtMarketplace.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;

namespace ArtMarketplace.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrderController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrderController(AppDbContext context) => _context = context;

  
    // ADMIN

    // GET: /api/order (admin)
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetAll(CancellationToken ct)
    {
        var orders = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Product)
            .Include(o => o.Client)
            .Include(o => o.Artisan)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Ok(orders);
    }

    // CLIENT

    // POST: /api/order  (client)  body: { productId: 123 }
    [Authorize(Roles = "Client")]
    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderDto dto, CancellationToken ct)
    {
        if (dto is null || dto.ProductId <= 0) return BadRequest("productId requis.");

        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
        if (product == null) return NotFound("Produit introuvable.");

        var order = new Order
        {
            ClientId = userId.Value,
            ProductId = product.Id,
            ArtisanId = product.ArtisanId,
            OrderDate = DateTime.UtcNow,
            Status = "Pending"
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    // GET: /api/order/mine  (client)
    [Authorize(Roles = "Client")]
    [HttpGet("mine")]
    public async Task<ActionResult<IEnumerable<Order>>> GetMine(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var uid = userId.Value;

        var orders = await _context.Orders
            .AsNoTracking()
            .Where(o => o.ClientId == uid)
            .Include(o => o.Product)
            .Include(o => o.Artisan)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Ok(orders);
    }

    // ARTISAN

    // GET: /api/order/artisan  (artisan)
    [Authorize(Roles = "Artisan")]
    [HttpGet("artisan")]
    public async Task<ActionResult<IEnumerable<Order>>> GetForArtisan(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var uid = userId.Value;

        var orders = await _context.Orders
            .AsNoTracking()
            .Where(o => o.ArtisanId == uid)
            .Include(o => o.Product)
            .Include(o => o.Client)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Ok(orders);
    }

    // PUT: /api/order/{id}/status  (artisan)  body: { status: "Pending" | "InProduction" | "Shipped" | "Delivered" }
    [Authorize(Roles = "Artisan")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto, CancellationToken ct)
    {
        if (dto is null || string.IsNullOrWhiteSpace(dto.Status))
            return BadRequest("Statut requis.");

        var allowed = new[] { "Pending", "InProduction", "Shipped", "Delivered" };
        if (!allowed.Contains(dto.Status))
            return BadRequest("Statut invalide.");

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order == null) return NotFound();

        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (order.ArtisanId != userId.Value) return Forbid();

        order.Status = dto.Status;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    // DETAIL COMMUN

    // GET: /api/order/{id} (Admin ou partie prenante)
    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Order>> GetById(int id, CancellationToken ct)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .Include(o => o.Product)
            .Include(o => o.Client)
            .Include(o => o.Artisan)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order == null) return NotFound();

        if (User.IsInRole("Admin")) return Ok(order);

        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var uid = userId.Value;

        if (order.ClientId != uid && order.ArtisanId != uid) return Forbid();

        return Ok(order);
    }

    // LIVREUR

    // GET /api/order/delivery  (livreur connecté) -> commandes assignées à lui
    [Authorize(Roles = "DeliveryPartner")]
    [HttpGet("delivery")]
    public async Task<ActionResult<IEnumerable<Order>>> GetForDelivery(CancellationToken ct)
    {
        var dpId = GetUserId();
        if (dpId is null) return Unauthorized();
        var uid = dpId.Value;

        var list = await _context.Orders
            .AsNoTracking()
            .Where(o => o.DeliveryPartnerId == uid)
            .Include(o => o.Product)
            .Include(o => o.Client)
            .Include(o => o.Artisan)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Ok(list);
    }

    // GET /api/order/delivery/available  (livreur: courses non assignées, prêtes)
    [Authorize(Roles = "DeliveryPartner")]
    [HttpGet("delivery/available")]
    public async Task<ActionResult<IEnumerable<Order>>> GetAvailableForDelivery(CancellationToken ct)
    {
        var list = await _context.Orders
            .AsNoTracking()
            .Where(o => (o.Status == "Shipped" || o.Status == "PickedUp") && o.DeliveryPartnerId == null)
            .Include(o => o.Product)
            .Include(o => o.Artisan)
            .OrderByDescending(o => o.Id)
            .ToListAsync(ct);

        return Ok(list);
    }

    // PUT /api/order/{id}/assign-self  (livreur se l’auto-assigne si non assignée et status Shipped/PickedUp)
    [Authorize(Roles = "DeliveryPartner")]
    [HttpPut("{id:int}/assign-self")]
    public async Task<IActionResult> AssignSelf(int id, CancellationToken ct)
    {
        var dpId = GetUserId();
        if (dpId is null) return Unauthorized();

        var o = await _context.Orders.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (o == null) return NotFound();
        if (o.DeliveryPartnerId != null && o.DeliveryPartnerId != dpId.Value) return Forbid();
        if (o.Status != "Shipped" && o.Status != "PickedUp")
            return BadRequest("La commande doit être expédiée pour être prise en charge.");

        o.DeliveryPartnerId = dpId.Value;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    // PUT /api/order/delivery/{id}/status  (livreur met à jour le statut si assigné)
    [Authorize(Roles = "DeliveryPartner")]
    [HttpPut("delivery/{id:int}/status")]
    public async Task<IActionResult> DeliveryUpdateStatus(int id, [FromBody] UpdateStatusDto dto, CancellationToken ct)
    {
        var allowed = new[] { "PickedUp", "InTransit", "Delivered" };
        if (dto is null || string.IsNullOrWhiteSpace(dto.Status) || !allowed.Contains(dto.Status))
            return BadRequest("Statut invalide.");

        var dpId = GetUserId();
        if (dpId is null) return Unauthorized();

        var o = await _context.Orders.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (o == null) return NotFound();
        if (o.DeliveryPartnerId != dpId.Value) return Forbid();

        o.Status = dto.Status;
        await _context.SaveChangesAsync(ct);
        return NoContent();
    }

    

    private int? GetUserId()
    {
        var v = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(v, out var id) ? id : null;
    }

    // DTOs
    public sealed class EarningsDto
    {
        public decimal Total { get; set; }
        public int OrdersCount { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
    }
}

public sealed record CreateOrderDto(int ProductId);
public sealed record UpdateStatusDto(string Status);
