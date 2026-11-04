using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class WorkflowMaster
    {
        [Key]
        public int WorkflowId { get; set; }

        [Required]
        public string WorkflowName { get; set; } = string.Empty;

        [Required]
        public string ModuleName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public ICollection<WorkflowSteps>? WorkflowSteps { get; set; }

        public ICollection<WorkflowHistory>? WorkflowHistories { get; set; }
    }
}