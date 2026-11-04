namespace EmployeeManagementSystem.DTOs
{
    public class UpdateReportingDaysDto
    {
        public int TeamId { get; set; }

        public List<string> ReportingDays { get; set; } = new();

        public DateTime? WeekStartDate { get; set; }

        public DateTime? WeekEndDate { get; set; }

        public bool IsDefaultAllWeeks { get; set; } = false;
    }
}
