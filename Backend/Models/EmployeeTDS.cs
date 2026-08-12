using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class EmployeeTDS
    {
        [Key]
        public int TDSId { get; set; }

        public string Employee_Id { get; set; }

        public string FinancialYear { get; set; }

        public decimal GrossSalary { get; set; }

        public decimal TaxableIncome { get; set; }

        public decimal TotalTax { get; set; }

        public decimal MonthlyTDS { get; set; }

        public DateTime GeneratedOn { get; set; }
    }
}