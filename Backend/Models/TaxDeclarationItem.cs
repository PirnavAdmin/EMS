using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class TaxDeclarationItem
    {
        [Key]
        public int ItemId { get; set; }

        public int TaxDeclarationId { get; set; }

        public string SectionName { get; set; }

        public string SectionCode { get; set; }

        public decimal DeclaredAmount { get; set; }

        public decimal ApprovedAmount { get; set; }
    }
}