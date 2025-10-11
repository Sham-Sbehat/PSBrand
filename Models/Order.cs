using System.ComponentModel.DataAnnotations;

namespace PSBrand.API.Models
{
    public class Order
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string OrderNumber { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string CustomerName { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string CustomerPhone { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Country { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Province { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string District { get; set; } = string.Empty;
        
        public DateTime OrderDate { get; set; } = DateTime.Now;
        
        public decimal TotalAmount { get; set; }
        
        public OrderStatus Status { get; set; } = OrderStatus.Pending;
        
        public int DesignerId { get; set; }
        
        public int? PreparerId { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public virtual User Designer { get; set; } = null!;
        public virtual User? Preparer { get; set; }
        public virtual ICollection<OrderDesign> OrderDesigns { get; set; } = new List<OrderDesign>();
    }
    
    public enum OrderStatus
    {
        Pending = 1,    // قيد التحضير
        Approved = 2,   // جاهز
        Delivered = 3   // تم التسليم
    }
}