namespace ArtMarketplace.Domain.Entities;

public class Product
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public decimal Price { get; set; }

    public string ImageUrl { get; set; } = null!;

    // Clé étrangère vers l’artisan (utilisateur)
    public int ArtisanId { get; set; }
    public User? Artisan { get; set; }

    public ICollection<Review> Reviews { get; set; } = new List<Review>();

    public bool IsApproved { get; set; } = false;

}
