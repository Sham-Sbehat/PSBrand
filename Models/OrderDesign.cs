using System.ComponentModel.DataAnnotations;

namespace PSBrand.API.Models
{
    public class OrderDesign
    {
        public int Id { get; set; }
        
        public int OrderId { get; set; }
        
        [Required]
        [StringLength(200)]
        public string DesignImageUrl { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string FabricType { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string Size { get; set; } = string.Empty;
        
        public int Quantity { get; set; }
        
        public decimal UnitPrice { get; set; }
        
        public decimal TotalPrice { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // Navigation Properties
        public virtual Order Order { get; set; } = null!;
    }
}