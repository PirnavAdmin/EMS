namespace EmployeeManagementSystem.DTOs
{
    public class WeeklyAttendanceDto
    {
        public string Day { get; set; }
        public DateTime Date { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public int WorkingMinutes { get; set; }
        public string Status { get; set; }
    }
}