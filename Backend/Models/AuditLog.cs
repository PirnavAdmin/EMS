// varsha - Multi-tenant AuditLog model with OldValues and NewValues tracking
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("auditlogs")]
    public class AuditLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; } // varsha - updated to long for high-volume audit records

        [Required]
        [MaxLength(100)]
        public string OrganizationCode { get; set; } = string.Empty; // varsha - multi-tenant organization partition

        public int? OrganizationId { get; set; }

        [MaxLength(100)]
        public string? UserId { get; set; }

        [MaxLength(255)]
        public string? UserName { get; set; }

        [MaxLength(100)]
        public string? UserRole { get; set; }

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Module { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? EntityName { get; set; } // varsha - tracked entity type

        [MaxLength(100)]
        public string? EntityId { get; set; }

        public string? Description { get; set; }

        [Column(TypeName = "longtext")]
        public string? OldValues { get; set; } // varsha - serialized previous values

        [Column(TypeName = "longtext")]
        public string? NewValues { get; set; } // varsha - serialized updated values

        [NotMapped]
        public string? OldValue // varsha - backward compatibility alias
        {
            get => OldValues;
            set => OldValues = value;
        }

        [NotMapped]
        public string? NewValue // varsha - backward compatibility alias
        {
            get => NewValues;
            set => NewValues = value;
        }

        [MaxLength(100)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? UserAgent { get; set; } // varsha - client browser/agent

        [MaxLength(20)]
        public string? RequestMethod { get; set; } // varsha - HTTP method

        [MaxLength(500)]
        public string? RequestPath { get; set; } // varsha - HTTP request path

        public int StatusCode { get; set; } = 200; // varsha - HTTP response status code

        [MaxLength(100)]
        public string? CorrelationId { get; set; } // varsha - distributed tracing identifier

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
