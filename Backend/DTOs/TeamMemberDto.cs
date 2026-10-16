namespace EmployeeManagementSystem.DTOs

{

    public class TeamMemberDto

    {

        public int TeamMemberId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public string EmployeeName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string? Technology { get; set; }

        public string ProjectName { get; set; } = string.Empty;

        public bool CrossTeam { get; set; }

        public int? OverrideProjectId { get; set; }

        public string OverrideProjectName { get; set; } = string.Empty;

        // Effective Shift applied to this member

        public int? ShiftId { get; set; }

        public string? ShiftName { get; set; }

        // Explicit individual custom shift override

        public bool CustomShift { get; set; }

        public int? OverrideShiftId { get; set; }

        public string? OverrideShiftName { get; set; }

        // Reporting Days

        public bool CustomReportingDays { get; set; }

        public List<string> OverrideWfoDays { get; set; } = new();

        public List<string> OverrideWfhDays { get; set; } = new();

    }

}

