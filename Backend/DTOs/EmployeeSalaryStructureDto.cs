using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeSalaryStructureDto
    {
        public string? Employee_Id { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal AnnualCTC { get; set; }

        [Range(0, double.MaxValue)]
        public decimal BasicSalary { get; set; }

        [Range(0, double.MaxValue)]
        public decimal HRA { get; set; }

        [Range(0, double.MaxValue)]
        public decimal ConveyanceAllowance { get; set; }

        [Range(0, double.MaxValue)]
        public decimal MedicalAllowance { get; set; }

        [Range(0, double.MaxValue)]
        public decimal SpecialAllowance { get; set; }

        [Range(0, double.MaxValue)]
        public decimal EmployeePF { get; set; }

        [Range(0, double.MaxValue)]
        public decimal EmployerPF { get; set; }

        [Range(0, double.MaxValue)]
        public decimal ProfessionalTax { get; set; }

        [Range(0, double.MaxValue)]
        public decimal TDS { get; set; }

        [Range(0, double.MaxValue)]
        public decimal OtherDeduction { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public bool IsActive { get; set; } = true;
    }
}