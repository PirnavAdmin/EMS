using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("SchedulerLog")]
    public class SchedulerLog
    {
        [Key]
        public int Id { get; set; }

        public string SchedulerName { get; set; } = string.Empty;

        public DateTime StartedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public int TotalTickets { get; set; }

        public int AssignedTickets { get; set; }

        public int FailedTickets { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? ErrorMessage { get; set; }
    }
}