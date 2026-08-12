using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("ShiftPlanner")]
    public class ShiftPlanner
    {
        [Key]
        public int PlannerId { get; set; }

        [Required]
        public int ShiftId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        [Required]
        public DateTime ToDate { get; set; }

        public int? Department_Id { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        public bool IsPublished { get; set; } = false;

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [MaxLength(100)]
        public string? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        [ForeignKey(nameof(ShiftId))]
        public virtual ShiftMaster? Shift { get; set; }
    }
}