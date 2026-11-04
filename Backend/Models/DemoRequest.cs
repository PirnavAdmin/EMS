using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("demo_requests")]
    public class DemoRequest
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required, EmailAddress, StringLength(254)]
        public string Email { get; set; } = string.Empty;

        [StringLength(30)]
        public string? Phone { get; set; }

        [StringLength(200)]
        public string? Company { get; set; }

        [Required, StringLength(2000)]
        public string Message { get; set; } = string.Empty;

        [StringLength(30)]
        public string Status { get; set; } = "New";

        [StringLength(2000)]
        public string? AdminReply { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RepliedAt { get; set; }
    }
}
