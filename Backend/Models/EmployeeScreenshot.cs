using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class EmployeeScreenshot
    {
        [Key]
        public int Id { get; set; }

        public string EmployeeId { get; set; }

        public string ScreenshotPath { get; set; }

        public string DeviceName { get; set; }

        public string MonitoringStatus { get; set; }

        public DateTime CapturedAt { get; set; } = DateTime.Now;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}