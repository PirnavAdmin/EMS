namespace EmployeeManagementSystem.DTOs

{

    public class AgreementStatusDto

    {

        public int EmployeeAgreementId { get; set; }

        public string EmployeeId { get; set; }

        public string EmployeeName { get; set; }

        public string AgreementName { get; set; }

        public string AgreementCode { get; set; } = string.Empty;

        public string Status { get; set; }

        public string? SignatureName { get; set; }

        public string? SignedLocation { get; set; }

        public DateTime? SignedOn { get; set; }

    }

}
