namespace EmployeeManagementSystem.DTOs
{
    public class ExitInterviewResponseDto
    {
        public int ExitInterviewId { get; set; }

        public int ResignationId { get; set; }

        public string? ConductedBy { get; set; }

        public string? ReasonForLeaving { get; set; }

        public string? Feedback { get; set; }

        public string? Suggestions { get; set; }

        public DateTime InterviewDate { get; set; }
    }
}