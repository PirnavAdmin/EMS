using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class EmployeeClearance
    {
        [Key]
        public int ClearanceId { get; set; }

        [Required]
        public int ResignationId { get; set; }

        public string ITStatus { get; set; } = "Pending";
        public string AdminStatus { get; set; } = "Pending";
        public string FinanceStatus { get; set; } = "Pending";
        public string HRStatus { get; set; } = "Pending";

        public string? ITRemarks { get; set; }
        public string? AdminRemarks { get; set; }
        public string? FinanceRemarks { get; set; }
        public string? HRRemarks { get; set; }

        public DateTime? CompletedDate { get; set; }

        [ForeignKey(nameof(ResignationId))]
        public EmployeeResignation? EmployeeResignation { get; set; }
    }
}