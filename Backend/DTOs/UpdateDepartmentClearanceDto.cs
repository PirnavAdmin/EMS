using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class UpdateDepartmentClearanceDto
    {
        [Required]
        public int ClearanceId { get; set; }

        [Required]
        public string Department { get; set; }

        [Required]
        public bool IsApproved { get; set; }

        public string? Remarks { get; set; }
    }
}