using Microsoft.AspNetCore.Http;

using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs

{

    public class UploadAgreementDto

    {

        [Required]
        // need to chnage
        public string AgreementCode { get; set; }

        [Required]

        public string AgreementName { get; set; }

        public string? Description { get; set; }

        public bool IsMandatory { get; set; }

        public bool AssignToExistingEmployees { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]

        public IFormFile File { get; set; }

    }

}
