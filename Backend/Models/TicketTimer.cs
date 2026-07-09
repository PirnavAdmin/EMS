using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("TicketTimer")]
    public class TicketTimer
    {
        [Key]
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public DateTime StartTime { get; set; }

        public DateTime? EndTime { get; set; }

        public int WorkedMinutes { get; set; }

        public DateOnly WorkingDate { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey(nameof(TicketId))]
        public virtual Ticket? Ticket { get; set; }
    }
}