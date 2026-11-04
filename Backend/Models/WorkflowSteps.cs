using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class WorkflowSteps
    {
        [Key]
        public int StepId { get; set; }

        public int WorkflowId { get; set; }

        public int StepNumber { get; set; }

        [Required]
        public string RoleName { get; set; } = string.Empty;

        public bool IsFinalStep { get; set; }

        [ForeignKey(nameof(WorkflowId))]
        public WorkflowMaster? WorkflowMaster { get; set; }
    }
}