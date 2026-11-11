namespace EmployeeManagementSystem.DTOs
{
    public class UpdateTeamWeeklyOffDto
    {
        public int TeamId { get; set; }
        public List<string> WeeklyOffDays { get; set; } = new();
    }
}