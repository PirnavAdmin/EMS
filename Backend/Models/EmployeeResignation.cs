using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class EmployeeResignation
    {
        [Key]
        public int ResignationId { get; set; }

        [Required]
        [StringLength(20)]
        [ForeignKey("Employee")]
        public string Employee_Id { get; set; }

        [Required]
        public DateTime ResignationDate { get; set; }

        [Required]
        public DateTime LastWorkingDate { get; set; }

        public string? Reason { get; set; }

        public int NoticePeriod { get; set; } = 30;

        public string ManagerStatus { get; set; } = "Pending";

        public string HRStatus { get; set; } = "Pending";

        public string OverallStatus { get; set; } = "Pending";

        public string? ManagerRemarks { get; set; }

        public string? HRRemarks { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [ForeignKey(nameof(Employee_Id))]
        public Employee? Employee { get; set; }
    }
}