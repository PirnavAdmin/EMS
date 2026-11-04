using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class MonitoringSettings
    {
        [Key]
        public int Id { get; set; }

        public int ScreenshotInterval { get; set; } = 5;

        public bool EnableScreenshotMonitoring { get; set; } = true;

        public bool EnableActiveWindowTracking { get; set; } = true;

        public bool EnableIdleDetection { get; set; } = true;

        public bool EnableAutoUpload { get; set; } = true;

        public bool EnableBackgroundMonitoring { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }
}