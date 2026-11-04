namespace EmployeeManagementSystem.DTOs

{

    public class EmployeeAgreementDto

    {

        public int EmployeeAgreementId { get; set; }

        public string AgreementCode { get; set; } = string.Empty;

        public string AgreementName { get; set; } = string.Empty;

        public string AgreementVersion { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime? SignedOn { get; set; }

        public string? DownloadUrl { get; set; }

    }

}
