namespace EmployeeManagementSystem.DTOs
{
    public class ReportingDayDto
    {
        public string DayName { get; set; } = string.Empty;

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public List<DateTime> ActualDates { get; set; } = new();
    }
}