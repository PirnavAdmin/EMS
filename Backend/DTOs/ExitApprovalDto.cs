using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs

{

    public class ExitApprovalDto

    {

        [Required]

        public int ResignationId { get; set; }

        [Required]

        public bool IsApproved { get; set; }

        public string? Remarks { get; set; }

    }

}
