namespace EmployeeManagementSystem.DTOs
{
    public class AttendanceResponseDto
    {
        public DateTime? CheckIn { get; set; }

        public DateTime? CheckOut { get; set; }

        public string WorkingHours { get; set; }

        public string Status { get; set; }
    }
}