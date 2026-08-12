using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("ShiftSwap")]
    public class ShiftSwap
    {
        [Key]
        public int SwapId { get; set; }

        [Required]
        public string FromEmployeeId { get; set; } = "";

        [Required]
        public string ToEmployeeId { get; set; } = "";

        public DateTime ShiftDate { get; set; }

        public int ShiftId { get; set; }

        public string? Reason { get; set; }

        public string Status { get; set; } = "Pending";

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}