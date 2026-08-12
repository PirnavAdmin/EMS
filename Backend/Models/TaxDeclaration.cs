using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class TaxDeclaration
    {
        [Key]
        public int TaxDeclarationId { get; set; }

        public string Employee_Id { get; set; }

        public string FinancialYear { get; set; }

        public string Regime { get; set; }

        public decimal TotalDeclaredAmount { get; set; }

        public string Status { get; set; }

        public DateTime? SubmittedOn { get; set; }

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedOn { get; set; }

        public string? Remarks { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}