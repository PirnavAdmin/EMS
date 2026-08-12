using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateClearanceDto
    {
        [Required]
        public int ResignationId { get; set; }
    }
}