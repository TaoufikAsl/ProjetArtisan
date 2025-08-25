using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArtMarketplace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddArtisanResponseToReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArtisanResponse",
                table: "Reviews",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ArtisanResponseDate",
                table: "Reviews",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArtisanResponse",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ArtisanResponseDate",
                table: "Reviews");
        }
    }
}
