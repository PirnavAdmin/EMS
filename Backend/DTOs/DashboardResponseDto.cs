namespace EmployeeManagementSystem.DTOs
{
    public class DashboardResponseDto
    {
        public int TotalEmployees { get; set; }
        public int TotalDepartments { get; set; }
        public int ActiveProjects { get; set; }
        public double AttendancePercentage { get; set; }

        public List<RecentActivityDto> RecentActivities { get; set; }
        public List<UpComingHolidayDto> UpcomingHolidays { get; set; }
    }
}
