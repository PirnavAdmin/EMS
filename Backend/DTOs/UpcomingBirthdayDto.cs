namespace EmployeeManagementSystem.DTOs
{
    public class UpcomingBirthdayDto
    {
        public string EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public string Birthday { get; set; } = string.Empty;
        public int DaysRemaining { get; set; }
    }
}
