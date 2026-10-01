namespace EmployeeManagementSystem.DTOs
{
    public class TeamDetailDto
    {
        public int TeamId { get; set; }

        public string TeamNumber { get; set; } = "";

        public string TeamName { get; set; } = "";

        public int ProjectId { get; set; }

        public string ProjectName { get; set; } = "";

        public string ReportingManagerId { get; set; } = "";

        public string ReportingManager { get; set; } = "";

        public string EngagementType { get; set; } = "";

        public int? ShiftId { get; set; } // <--- ADDED

        public string? ShiftName { get; set; } // <--- ADDED

        public List<string> ReportingDays { get; set; } = new();

        public List<MemberDto> Members { get; set; } = new();
    }

    public class MemberDto
    {
        public int TeamMemberId { get; set; }

        public string EmployeeId { get; set; } = "";

        public string Name { get; set; } = "";

        public string Role { get; set; } = "";

        public string? Technology { get; set; }

        public string ProjectName { get; set; } = "";

        public bool CrossTeam { get; set; }

        public int? OverrideProjectId { get; set; }

        public string OverrideProjectName { get; set; } = "";

        public int? ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public int? OverrideShiftId { get; set; }

        public string? OverrideShiftName { get; set; }

        public List<string> OverrideWfoDays { get; set; } = new();

        public List<string> OverrideWfhDays { get; set; } = new();
    }
}
