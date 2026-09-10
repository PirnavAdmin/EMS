using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("statuschangelogs")]

    public class StatusChangeLog

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public string EntityType { get; set; } = string.Empty; // "Organization", "Admin", "Employee", "Role"

        [Required]

        public string EntityId { get; set; } = string.Empty;

        public string? PreviousStatus { get; set; }

        [Required]

        public string NewStatus { get; set; } = string.Empty;

        public string? ChangedByUserId { get; set; }

        public string? ChangedByRole { get; set; }

        public string? Reason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }

}

