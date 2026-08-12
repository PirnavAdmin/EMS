using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeSalaryStructures")]
    public class EmployeeSalaryStructure
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Employee_Id { get; set; } = null!;

        // CTC
        [Column(TypeName = "decimal(18,2)")]
        public decimal AnnualCTC { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyCTC { get; set; }

        // Earnings
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasicSalary { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal HRA { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ConveyanceAllowance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MedicalAllowance { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SpecialAllowance { get; set; }

        // Deductions
        [Column(TypeName = "decimal(18,2)")]
        public decimal EmployeePF { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal EmployerPF { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ProfessionalTax { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TDS { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal OtherDeduction { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}