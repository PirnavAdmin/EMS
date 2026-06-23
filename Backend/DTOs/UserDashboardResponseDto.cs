namespace EmployeeManagementSystem.DTOs
{
    public class UserDashboardResponseDto
    {
        public int MyTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int PendingTasks { get; set; }
        public double Attendance { get; set; }
        public List<RecentActivityDto> RecentActivities { get; set; }
        public List<UpComingHolidayDto> UpcomingHolidays { get; set; }


    }
}