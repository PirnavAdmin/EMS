using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("emailsenderaccounts")]
    public class EmailSenderAccount
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(320)]
        public string SenderEmail { get; set; } = string.Empty;

        // Stored encrypted with ASP.NET Core Data Protection; never return this field from an API.
        [Required]
        public string EncryptedPassword { get; set; } = string.Empty;

        [Required, MaxLength(255)]
        public string SmtpHost { get; set; } = string.Empty;

        public int SmtpPort { get; set; }
        public bool EnableSSL { get; set; }

        [MaxLength(255)]
        public string DisplayName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
