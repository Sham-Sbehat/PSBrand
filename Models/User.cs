using System.ComponentModel.DataAnnotations;

namespace PSBrand.API.Models
{
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [StringLength(50)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;
        
        [Required]
        public UserRole Role { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation Properties
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    }
    
    public enum UserRole
    {
        Admin = 1,
        Designer = 2,
        Preparer = 3
    }
}