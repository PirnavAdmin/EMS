using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class AppraisalLetter
    {
        [Key]
        public int AppraisalLetterId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public int AppraisalId { get; set; }

        public string PdfPath { get; set; } = string.Empty;

        public DateTime GeneratedOn { get; set; } = DateTime.Now;

        public string GeneratedBy { get; set; } = string.Empty;

        [ForeignKey(nameof(AppraisalId))]
        public Appraisal? Appraisal { get; set; }
    }
}