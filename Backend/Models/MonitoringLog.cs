using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class MonitoringLog
    {
        [Key]
        public int Id { get; set; }

        public string EmployeeId { get; set; }

        public string ActiveWindow { get; set; }

        public int IdleMinutes { get; set; }

        public DateTime LastActiveTime { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}