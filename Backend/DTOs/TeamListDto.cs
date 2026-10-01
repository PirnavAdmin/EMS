namespace EmployeeManagementSystem.DTOs
{
    public class TeamMemberSummaryDto
    {
        public string EmployeeId { get; set; } = "";
        public string Name { get; set; } = "";
    }

    public class TeamListDto
    {
        public int TeamId { get; set; }

        public string TeamNumber { get; set; } = "";

        public string TeamName { get; set; } = "";

        public string ProjectName { get; set; } = "";

        public string ManagerName { get; set; } = "";

        public int? ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public List<string> ReportingDays { get; set; } = new();

        public List<string> EmployeeNames { get; set; } = new();

        public List<TeamMemberSummaryDto> Members { get; set; } = new();
    }
}
