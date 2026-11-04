using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("ShiftChangeRequest")]
    public class ShiftChangeRequest
    {
        [Key]
        public int RequestId { get; set; }

        [Required]
        public string Employee_Id { get; set; } = string.Empty;

        public int CurrentShiftId { get; set; }

        public int RequestedShiftId { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public bool IsPermanent { get; set; }

        public string? Reason { get; set; }

        public string Status { get; set; } = "Pending";

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}