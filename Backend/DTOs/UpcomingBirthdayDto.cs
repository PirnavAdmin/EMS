namespace EmployeeManagementSystem.DTOs
{
    public class UpcomingBirthdayDto
    {
        public string EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public DateTime Birthday { get; set; }
        public int DaysRemaining { get; set; }
    }
}
