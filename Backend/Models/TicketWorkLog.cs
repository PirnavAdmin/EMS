using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("TicketWorkLogs")]
    public class TicketWorkLog
    {
        [Key]
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public DateTime StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        public int WorkedMinutes { get; set; }

        public string? Remarks { get; set; }

        public bool IsRunning { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(TicketId))]
        public virtual Ticket? Ticket { get; set; }
    }
}