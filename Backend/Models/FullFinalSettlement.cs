using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class FullFinalSettlement
    {
        [Key]
        public int SettlementId { get; set; }

        [Required]
        public string Employee_Id { get; set; }

        public decimal GrossSalary { get; set; }

        public decimal LeaveEncashment { get; set; }

        public decimal Bonus { get; set; }

        public decimal Deductions { get; set; }

        public decimal NetSettlement { get; set; }

        public DateTime GeneratedDate { get; set; } = DateTime.Now;

        public string Status { get; set; } = "Pending";

        [ForeignKey(nameof(Employee_Id))]
        public Employee? Employee { get; set; }
    }
}