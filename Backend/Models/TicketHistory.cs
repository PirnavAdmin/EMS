using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("TicketHistory")]
    public class TicketHistory
    {
        [Key]
        public int Id { get; set; }

        public int TicketId { get; set; }

        public string? EmployeeId { get; set; }

        public string Action { get; set; } = string.Empty;

        public string? OldStatus { get; set; }

        public string? NewStatus { get; set; }

        public string? Remarks { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey(nameof(TicketId))]
        public virtual Ticket? Ticket { get; set; }
    }
}