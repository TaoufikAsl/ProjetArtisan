namespace ArtMarketplace.Domain.Entities
{
    public class Review
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public int ClientId { get; set; }
        public int Rating { get; set; }       // 1..5
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Product? Product { get; set; }
        public User? Client { get; set; }
    }
}
