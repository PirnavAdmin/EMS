namespace EmployeeManagementSystem.DTOs
{
    public class ProjectMemberDto
    {
        public string? Employee_Id { get; set; } = string.Empty;

        public string? Name { get; set; } = string.Empty;

        public string? Technology { get; set; } = string.Empty;

        public bool IsActive { get; set; }
        public string AttendanceStatus { get; set; }
    }
}