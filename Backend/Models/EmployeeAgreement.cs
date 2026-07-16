using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("employeeagreement")]
    public class EmployeeAgreement

    {

        [Key]

        public int EmployeeAgreementId { get; set; }

        [Required]

        public string Employee_Id { get; set; }

        [Required]

        public int AgreementId { get; set; }

        [Required]

        public string AgreementName { get; set; }

        [Required]

        public string AgreementVersion { get; set; }

        [Required]

        public string SignatureName { get; set; }

        public DateTime? SignedOn { get; set; }

        public string? SignedLocation { get; set; }

        public string? SignedPdfPath { get; set; }

        public string? SignatureImagePath { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        // Navigation Property

        [ForeignKey(nameof(AgreementId))]

        public virtual AgreementMaster AgreementMaster { get; set; }

    }

}
