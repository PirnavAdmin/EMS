using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class UpdateShiftRosterDto
    {
        [Required]
        public int ShiftId { get; set; }

        [Required]
        public DateTime RosterDate { get; set; }

        public string? Remarks { get; set; }

        public bool IsPublished { get; set; }
    }
}