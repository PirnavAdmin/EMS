namespace EmployeeManagementSystem.DTOs
{
    public class TeamDetailDto
    {
        public int TeamId { get; set; }
        public string TeamNumber { get; set; } = "";
        public string TeamName { get; set; } = "";
        public int? ProjectId { get; set; }
        public string ProjectName { get; set; } = "";
        public string ReportingManagerId { get; set; } = "";
        public string ReportingManager { get; set; } = "";
        public string EngagementType { get; set; } = "";
        public int? ShiftId { get; set; }
        public List<string> WeeklyOffDays { get; set; } = new();
        public string? ShiftName { get; set; }
        public List<string> ReportingDays { get; set; } = new();
        public List<TeamMemberDto> Members { get; set; } = new();
    }
}
