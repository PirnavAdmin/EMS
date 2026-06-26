namespace EmployeeManagementSystem.DTOs
{
    public class WorkFromHomeDto
    {
        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }
        public string? LeaveType { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }
}