using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class AddWorkflowStepDto
    {
        [Required]
        public int WorkflowId { get; set; }

        [Required]
        public int StepNumber { get; set; }

        [Required]
        public string RoleName { get; set; }

        public bool IsFinalStep { get; set; }
    }
}