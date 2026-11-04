namespace EmployeeManagementSystem.Models
{
    public class TicketAssignment
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public string Status { get; set; } = "Assigned";

        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;

        public bool IsAccepted { get; set; } = false;

        public Ticket Ticket { get; set; }

        public Employee Employee { get; set; }
    }
}
