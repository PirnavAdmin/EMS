using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class GenerateSettlementDto
    {
        [Required]
        public string Employee_Id { get; set; }
    }
}