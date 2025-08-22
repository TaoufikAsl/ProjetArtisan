using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtMarketplace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryPartnerToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeliveryPartnerId",
                table: "Orders",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryPartnerId",
                table: "Orders");
        }
    }
}
