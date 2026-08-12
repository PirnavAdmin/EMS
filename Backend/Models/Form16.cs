using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class Form16
    {
        [Key]
        public int Form16Id { get; set; }

        public string Employee_Id { get; set; }

        public string FinancialYear { get; set; }

        public string PdfPath { get; set; }

        public DateTime GeneratedOn { get; set; }

        public string GeneratedBy { get; set; }
    }
}