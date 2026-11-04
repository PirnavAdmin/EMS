using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateWorkflowDto
    {
        [Required]
        public string WorkflowName { get; set; }

        [Required]
        public string ModuleName { get; set; }

        public bool IsActive { get; set; } = true;
    }
}