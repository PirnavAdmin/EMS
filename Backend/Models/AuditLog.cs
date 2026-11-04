using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("auditlogs")]

    public class AuditLog

    {

        [Key]

        public int Id { get; set; }

        public string? UserId { get; set; }

        public string? UserName { get; set; }

        public string? UserRole { get; set; }

        [Required]

        public string Action { get; set; } = string.Empty;

        [Required]

        public string Module { get; set; } = string.Empty;

        public string? EntityId { get; set; }

        public string? Description { get; set; }

        public string? OldValue { get; set; }

        public string? NewValue { get; set; }

        public string? IpAddress { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }

}

