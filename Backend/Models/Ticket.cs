using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("tickets")]
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        [Column("OrganizationId")]
        public int OrganizationId { get; set; }

        public string TicketNumber { get; set; } = string.Empty;

        public int ProjectId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string Technology { get; set; } = string.Empty;

        public string? Module { get; set; }

        public string Priority { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending Assignment";

        public string? AssignedTo { get; set; }

        public string AssignedBy { get; set; } = string.Empty;

        public DateTime? AssignedDate { get; set; }

        public DateTime? OpenedDate { get; set; }

        public DateTime? CompletedDate { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }

        public DateTime? Deadline { get; set; }

        public decimal? EstimatedHours { get; set; }

        public decimal ActualHours { get; set; }

        public decimal RemainingHours { get; set; }

        public string SLAStatus { get; set; } = "Pending";

        public string? AssignmentType { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public DateTime? AssignedAt { get; set; }
        public DateTime? OverdueDate { get; set; }
        public int DelayMinutes { get; set; }
        public bool IsActive { get; set; } = true;

        [ForeignKey(nameof(ProjectId))]
        public virtual Project? Project { get; set; }
    }
}
