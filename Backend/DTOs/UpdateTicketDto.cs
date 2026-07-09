using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class UpdateTicketDto
    {
        [Required]
        public int ProjectId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public string Technology { get; set; } = string.Empty;

        [Required]
        public string Module { get; set; } = string.Empty;

        [Required]
        public string Priority { get; set; } = string.Empty;

        public string? AssignedTo { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }

        public decimal? EstimatedHours { get; set; }
    }
}