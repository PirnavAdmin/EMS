using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class UpdateResignationDto
    {
        [Required]
        public int ResignationId { get; set; }

        [Required]
        public DateTime LastWorkingDate { get; set; }

        [Required]
        public string Reason { get; set; }
    }
}