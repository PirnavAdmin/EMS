using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class WorkflowApprovalDto
    {
        [Required]
        public int HistoryId { get; set; }

        [Required]
        public bool IsApproved { get; set; }

        public string? Remarks { get; set; }

        [Required]
        public string ApprovedBy { get; set; }
    }
}