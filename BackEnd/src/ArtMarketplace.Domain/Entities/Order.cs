using System;

namespace ArtMarketplace.Domain.Entities;

public class Order
{
    public int Id { get; set; }

    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    public int ClientId { get; set; }       // User qui passe la commande
    public User Client { get; set; } = null!;

    public int ArtisanId { get; set; }      // Redondant, pour plus de simplicité en lecture
    public User Artisan { get; set; } = null!;

    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "En attente"; // ou "Validée", "Expédiée", "Livrée", etc.
    public int? DeliveryPartnerId { get; set; } // livreur
}
