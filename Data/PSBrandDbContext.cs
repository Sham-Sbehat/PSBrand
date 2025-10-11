using Microsoft.EntityFrameworkCore;
using PSBrand.API.Models;

namespace PSBrand.API.Data
{
    public class PSBrandDbContext : DbContext
    {
        public PSBrandDbContext(DbContextOptions<PSBrandDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDesign> OrderDesigns { get; set; }
        public DbSet<Commission> Commissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Phone).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Role).HasConversion<int>();
                entity.HasIndex(e => e.Email).IsUnique();
            });

            // Order Configuration
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.OrderNumber).IsRequired().HasMaxLength(50);
                entity.Property(e => e.CustomerName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.CustomerPhone).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Country).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Province).IsRequired().HasMaxLength(100);
                entity.Property(e => e.District).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Status).HasConversion<int>();
                entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");

                entity.HasOne(d => d.Designer)
                    .WithMany(p => p.Orders)
                    .HasForeignKey(d => d.DesignerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Preparer)
                    .WithMany()
                    .HasForeignKey(d => d.PreparerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // OrderDesign Configuration
            modelBuilder.Entity<OrderDesign>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DesignImageUrl).IsRequired().HasMaxLength(200);
                entity.Property(e => e.FabricType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Size).IsRequired().HasMaxLength(20);
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
                entity.Property(e => e.TotalPrice).HasColumnType("decimal(18,2)");

                entity.HasOne(d => d.Order)
                    .WithMany(p => p.OrderDesigns)
                    .HasForeignKey(d => d.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Commission Configuration
            modelBuilder.Entity<Commission>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CommissionPercentage).HasColumnType("decimal(5,2)");
                entity.Property(e => e.CommissionAmount).HasColumnType("decimal(18,2)");

                entity.HasOne(d => d.Designer)
                    .WithMany()
                    .HasForeignKey(d => d.DesignerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Order)
                    .WithMany()
                    .HasForeignKey(d => d.OrderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Seed Data
            SeedData(modelBuilder);
        }

        private void SeedData(ModelBuilder modelBuilder)
        {
            // Seed Admin User
            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    Name = "مدير النظام",
                    Email = "admin@psbrand.com",
                    Phone = "01234567890",
                    Role = UserRole.Admin,
                    IsActive = true,
                    CreatedAt = new DateTime(2024, 1, 1)
                }
            );
        }
    }
}