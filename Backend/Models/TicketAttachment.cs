namespace EmployeeManagementSystem.Models
{
    public class TicketAttachment
    {
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string EmployeeId { get; set; }

        public string FileName { get; set; }

        public string FilePath { get; set; }

        public string ContentType { get; set; }

        public long FileSize { get; set; }

        public DateTime UploadedAt { get; set; }

        public Ticket Ticket { get; set; }
    }
}