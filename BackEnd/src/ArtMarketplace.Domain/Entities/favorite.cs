namespace ArtMarketplace.Domain.Entities;

public class Favorite
{
    public int Id { get; set; }

    public int ClientId { get; set; }
    public int ProductId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Client { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
