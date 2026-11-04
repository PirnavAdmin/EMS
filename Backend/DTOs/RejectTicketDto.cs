namespace EmployeeManagementSystem.DTOs
{
    public class RejectTicketDto
    {
        public int TicketId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;
    }
}