namespace EmployeeManagementSystem.DTOs
{
    public class ExperienceLetterSendStatusDto
    {
        public int ExperienceLetterId { get; set; }

        public string EmployeeId { get; set; } = string.Empty;

        public string EmployeeName { get; set; } = string.Empty;

        public string? Designation { get; set; }

        public bool IsSent { get; set; }

        public int SentCount { get; set; }

        public DateTime? SentOn { get; set; }

        public string Status { get; set; } = string.Empty;
    }
}