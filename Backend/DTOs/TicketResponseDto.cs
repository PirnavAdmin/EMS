namespace EmployeeManagementSystem.DTOs
{
    public class TicketResponseDto
    {
        public int Id { get; set; }

        public string TicketNumber { get; set; } = string.Empty;

        public int ProjectId { get; set; }

        public string ProjectName { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Technology { get; set; } = string.Empty;

        public string Priority { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string AssignedTo { get; set; } = string.Empty;

        public string AssignedToName { get; set; } = string.Empty;

        public string AssignedBy { get; set; } = string.Empty;

        public string AssignedByName { get; set; } = string.Empty;

        public DateTime? StartDate { get; set; }

        public DateTime? DueDate { get; set; }

        public decimal? EstimatedHours { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}