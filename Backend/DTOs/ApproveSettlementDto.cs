using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class ApproveSettlementDto
    {
        [Required]
        public int SettlementId { get; set; }

        [Required]
        public bool IsApproved { get; set; }
    }
}