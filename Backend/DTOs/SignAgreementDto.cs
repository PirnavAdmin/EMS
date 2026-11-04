using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs

{

    public class SignAgreementDto

    {

        public string EmployeeId { get; set; } = string.Empty;

        public string AgreementCode { get; set; } = string.Empty;

        public string SignatureName { get; set; } = string.Empty;

        public string SignedLocation { get; set; } = string.Empty;

        public IFormFile SignatureImage { get; set; }

    }

}
