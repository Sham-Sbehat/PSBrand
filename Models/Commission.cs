namespace PSBrand.API.Models
{
    public class Commission
    {
        public int Id { get; set; }
        
        public int DesignerId { get; set; }
        
        public int OrderId { get; set; }
        
        public decimal CommissionPercentage { get; set; }
        
        public decimal CommissionAmount { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // Navigation Properties
        public virtual User Designer { get; set; } = null!;
        public virtual Order Order { get; set; } = null!;
    }
}