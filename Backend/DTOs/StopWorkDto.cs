namespace EmployeeManagementSystem.DTOs
{
    public class StopWorkDto
    {
        public int TicketId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public string? Remarks { get; set; }
    }
}