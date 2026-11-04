namespace EmployeeManagementSystem.DTOs
{
    public class UserDashboardResponseDto
    {
        public int MyTickets { get; set; }
        public int CompletedTickets { get; set; }
        public int PendingTickets { get; set; }
        public double Attendance { get; set; }
        public List<RecentActivityDto> RecentActivities { get; set; }
        public List<UpComingHolidayDto> UpcomingHolidays { get; set; }


    }
}