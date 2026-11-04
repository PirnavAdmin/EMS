using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeShiftAssignment")]
    public class EmployeeShiftAssignment
    {
        [Key]
        public int AssignmentId { get; set; }

        [Required]
        public string Employee_Id { get; set; } = string.Empty;

        [Required]
        public int ShiftId { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? UpdatedDate { get; set; }

        [ForeignKey(nameof(ShiftId))]
        public ShiftMaster? Shift { get; set; }
    }
}