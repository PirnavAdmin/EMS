namespace EmployeeManagementSystem.DTOs
{
    public class AppraisalSalaryDto
    {
        // Employee
        public string Employee_Id { get; set; } = string.Empty;

        // Appraisal
        public int AppraisalId { get; set; }

        // Hike
        public decimal HikePercentage { get; set; }

        // Effective date
        public DateTime EffectiveFrom { get; set; }

        // CTC
        public decimal AnnualCTC { get; set; }
        public decimal MonthlyCTC { get; set; }

        // Earnings
        public decimal BasicSalary { get; set; }
        public decimal HRA { get; set; }
        public decimal ConveyanceAllowance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal SpecialAllowance { get; set; }

        // Deductions
        public decimal EmployeePF { get; set; }
        public decimal EmployerPF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TDS { get; set; }
        public decimal OtherDeduction { get; set; }

        // Calculated values
        public decimal GrossSalary { get; set; }
        public decimal NetTakeHome { get; set; }

        // Values required for appraisal letter
        public decimal ESI { get; set; }
        public decimal VariablePay { get; set; }
        // Previous Salary Details
        public decimal PreviousAnnualCTC { get; set; }
        public decimal PreviousMonthlyCTC { get; set; }

        public decimal PreviousBasicSalary { get; set; }
        public decimal PreviousHRA { get; set; }

        public decimal PreviousConveyanceAllowance { get; set; }
        public decimal PreviousMedicalAllowance { get; set; }

        public decimal PreviousSpecialAllowance { get; set; }

        public decimal PreviousEmployeePF { get; set; }
        public decimal PreviousEmployerPF { get; set; }

        public decimal PreviousProfessionalTax { get; set; }
        public decimal PreviousTDS { get; set; }
        public decimal PreviousOtherDeduction { get; set; }
    }
}
