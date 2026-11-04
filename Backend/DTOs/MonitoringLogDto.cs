namespace EmployeeManagementSystem.DTOs
{
    public class MonitoringLogDto
    {
        public string EmployeeId { get; set; }

        public string ActiveWindow { get; set; }

        public int IdleMinutes { get; set; }

        public DateTime LastActiveTime { get; set; }
    }
}