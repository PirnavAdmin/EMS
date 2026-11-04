namespace EmployeeManagementSystem.DTOs
{
    public class MonitoringSettingsDto
    {
        public int ScreenshotInterval { get; set; }

        public bool EnableScreenshotMonitoring { get; set; }

        public bool EnableActiveWindowTracking { get; set; }

        public bool EnableIdleDetection { get; set; }

        public bool EnableAutoUpload { get; set; }

        public bool EnableBackgroundMonitoring { get; set; }
    }
}