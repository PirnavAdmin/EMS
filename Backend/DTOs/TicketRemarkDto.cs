namespace EmployeeManagementSystem.DTOs
{
    public class TicketRemarkDto
    {
        public string? EmployeeId { get; set; }

        public string? Remark { get; set; }

        public string? OldStatus { get; set; }

        public string? NewStatus { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}