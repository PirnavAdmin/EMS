
/*
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class Register
    {
        public int Id { get; set; }

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public string? OtpCode { get; set; }

        public DateTime? OtpExpiry { get; set; }
        public int RoleId { get; set; }
        public Role? Role { get; set; } 
        

        public bool IsOtpVerified { get; set; } = false;
     
        
    }
}
*/


using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("users")] // 🔥 VERY IMPORTANT (matches MySQL table)
    public class Register
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public string? OtpCode { get; set; }

        public DateTime? OtpExpiry { get; set; }

        // 🔥 Foreign Key
        public int? RoleId { get; set; }

        [ForeignKey("RoleId")]
        public Role? Role { get; set; }

        public bool IsOtpVerified { get; set; } = false;
    }
}