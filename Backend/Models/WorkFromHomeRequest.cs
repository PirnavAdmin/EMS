using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("WorkFromHomeRequests")]
    public class WorkFromHomeRequest
    {
        [Key]
        public int Id { get; set; }

        [Column("Employee_Id")]
        public string EmployeeId { get; set; } = string.Empty;

        [Column("Employee_Name")]
        public string EmployeeName { get; set; } = string.Empty;
        public string? LeaveType { get; set; } = string.Empty;
        [Column("From_Date")]
        public DateTime? FromDate { get; set; }

        [Column("To_Date")]
        public DateTime? ToDate { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedOn { get; set; }

        public DateTime AppliedOn { get; set; }
    }
}