using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class ExitInterview
    {
        [Key]
        public int ExitInterviewId { get; set; }

        [Required]
        public int ResignationId { get; set; }

        public string? ConductedBy { get; set; }

        public string? ReasonForLeaving { get; set; }

        public string? Feedback { get; set; }

        public string? Suggestions { get; set; }

        public DateTime InterviewDate { get; set; } = DateTime.Now;

        [ForeignKey(nameof(ResignationId))]
        public EmployeeResignation? EmployeeResignation { get; set; }
    }
}