using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class BulkShiftRosterDto
    {
        [Required]
        public List<string> EmployeeIds { get; set; } = new();

        [Required]
        public int ShiftId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        [Required]
        public DateTime ToDate { get; set; }

        public string? Remarks { get; set; }
    }
}