using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("shiftroster")]
    public class ShiftRoster
    {
        [Key]
        public int RosterId { get; set; }

        [Required]
        public string Employee_Id { get; set; } = string.Empty;

        [Required]
        public int ShiftId { get; set; }

        [Required]
        public DateTime RosterDate { get; set; }

        public string? Remarks { get; set; }

        public bool IsPublished { get; set; } = true;

        public string? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public string? UpdatedBy { get; set; }

        public DateTime? UpdatedDate { get; set; }

        // public Employee? Employee { get; set; }
        // public ShiftMaster? Shift { get; set; }
    }
}