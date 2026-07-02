namespace EmployeeManagementSystem.DTOs
{
    public class AttendanceDashboardDto
    {
        public double AttendancePercentage { get; set; }

        public int PresentDays { get; set; }

        public int AbsentDays { get; set; }

        public int HalfDays { get; set; }

        public int LeaveDays { get; set; }

        public string TodayWorkingHours { get; set; } = "";

        public List<WeeklyWorkingHourDto> WeeklyHours { get; set; } = new();
    }

    public class WeeklyWorkingHourDto
    {
        public string Day { get; set; } = "";

        public DateTime Date { get; set; }

        public string WorkingHours { get; set; } = "";

        public string Status { get; set; } = "";
    }
}
