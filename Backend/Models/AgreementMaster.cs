using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("agreementmaster")]
    public class AgreementMaster

    {


        [Key]

        public int AgreementId { get; set; }

        [Required]

        [MaxLength(50)]

        public string AgreementCode { get; set; }

        [Required]

        [MaxLength(200)]

        public string AgreementName { get; set; }

        public string? Description { get; set; }

        [Required]

        public string FileName { get; set; }

        [Required]

        public string FilePath { get; set; }

        [Required]

        public string Version { get; set; } = "1.0";

        public bool IsMandatory { get; set; } = true;

        public bool AssignToExistingEmployees { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public string? CreatedBy { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public string? ModifiedBy { get; set; }

        public DateTime? ModifiedDate { get; set; }

        // Navigation Property

        public virtual ICollection<EmployeeAgreement>? EmployeeAgreements { get; set; }

    }

}
