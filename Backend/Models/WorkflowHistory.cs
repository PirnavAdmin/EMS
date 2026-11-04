using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class WorkflowHistory
    {
        [Key]
        public int HistoryId { get; set; }

        public int WorkflowId { get; set; }

        public int StepNumber { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending";

        public string? ApprovedBy { get; set; }

        public string? Remarks { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? ActionDate { get; set; }

        [ForeignKey(nameof(WorkflowId))]
        public WorkflowMaster? WorkflowMaster { get; set; }
    }
}