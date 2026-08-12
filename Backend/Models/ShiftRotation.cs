using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("ShiftRotation")]
    public class ShiftRotation
    {
        [Key]
        public int RotationId { get; set; }

        [Required]
        public string Employee_Id { get; set; } = "";

        [Required]
        public string RotationType { get; set; } = "Weekly";

        public int Shift1Id { get; set; }

        public int? Shift2Id { get; set; }

        public int? Shift3Id { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}