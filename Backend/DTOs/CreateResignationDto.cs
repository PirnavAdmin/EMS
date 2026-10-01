using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateResignationDto
    {
       

        [Required]
        public DateTime ResignationDate { get; set; }

        [Required]
        public DateTime LastWorkingDate { get; set; }

        [Required]
        public string Reason { get; set; }
    }
}