using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("Tickets")]
    public class Ticket
    {
        [Key]
        public int Id { get; set; }

        public string TicketNumber { get; set; } = string.Empty;

        public int ProjectId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        // Backend
        // Frontend
        // Testing
        // QA
        // DevOps
        public string Technology { get; set; } = string.Empty;

        // Attendance
        // Payroll
        // Employee
        // Dashboard
        public string? Module { get; set; }

        public string Priority { get; set; } = string.Empty;

        // Pending Assignment
        // Assigned
        // In Progress
        // Completed
        // Reassigned
        // Cancelled
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

        // Pending
        // Running
        // Completed
        // Breached
        public string SLAStatus { get; set; } = "Pending";

        // Manual
        // Auto
        // Module Continuity
        // Least Workload
        // Round Robin
        public string? AssignmentType { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public DateTime? AssignedAt { get; set; }

        public bool IsActive { get; set; } = true;

        [ForeignKey(nameof(ProjectId))]
        public virtual Project? Project { get; set; }
    }
}