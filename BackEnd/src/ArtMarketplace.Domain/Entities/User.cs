using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ArtMarketplace.Domain.Entities
{
    public  class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public byte[] PasswordHash { get; set; } = null!;
        public byte[] PasswordSalt { get; set; } = null!;
        public string Role { get; set; } = null!; // "Client", "Artisan", "Delivery", "Admin"

    }
}
