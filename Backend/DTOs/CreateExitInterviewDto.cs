using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateExitInterviewDto
    {
        [Required]
        public int ResignationId { get; set; }

        [Required]
        public string ConductedBy { get; set; }

        [Required]
        public string ReasonForLeaving { get; set; }

        public string? Feedback { get; set; }

        public string? Suggestions { get; set; }

        public DateTime InterviewDate { get; set; } = DateTime.Now;
    }
}