using Microsoft.EntityFrameworkCore;
using ArtMarketplace.Domain.Entities;

namespace ArtMarketplace.Data.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Product> Products => Set<Product>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<Favorite> Favorites => Set<Favorite>();


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Bonne pratique : précise le type pour Price (évite les warning EF Core)
            modelBuilder.Entity<Product>()
                .Property(p => p.Price)
                .HasColumnType("decimal(18,2)");

            // Empêcher la suppression en cascade sur les relations User <-> Order
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Client)
                .WithMany()
                .HasForeignKey(o => o.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Artisan)
                .WithMany()
                .HasForeignKey(o => o.ArtisanId)
                .OnDelete(DeleteBehavior.Restrict);

            // Autoriser la suppression en cascade uniquement sur Product
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Product)
                .WithMany()
                .HasForeignKey(o => o.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Review>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.Rating).IsRequired();
                b.HasOne(r => r.Product)
                    .WithMany(p => p.Reviews)            // ajoute `ICollection<Review> Reviews` dans Product 
                    .HasForeignKey(r => r.ProductId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(r => r.Client)
                    .WithMany()
                    .HasForeignKey(r => r.ClientId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            //Favorites 
            modelBuilder.Entity<Favorite>()
                .HasIndex(f => new { f.ClientId, f.ProductId })
                .IsUnique();

            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.Product)
                .WithMany()
                .HasForeignKey(f => f.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.Client)
                .WithMany()
                .HasForeignKey(f => f.ClientId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
