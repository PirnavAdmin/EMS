namespace EmployeeManagementSystem.DTOs
{
    public class SendExperienceLetterDto
    {
        public int ExperienceLetterId { get; set; }

        public string Subject { get; set; } = string.Empty;

        public string Body { get; set; } = string.Empty;
    }
}