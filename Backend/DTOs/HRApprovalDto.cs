using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class HRApprovalDto
    {
        [Required]
        public int ResignationId { get; set; }

        [Required]
        public bool IsApproved { get; set; }

        public string? Remarks { get; set; }
    }
}