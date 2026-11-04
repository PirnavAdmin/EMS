namespace EmployeeManagementSystem.DTOs
{
    public class PaySlipPdfDto
    {
        public string EmployeeId { get; set; } = "";
        public string EmployeeName { get; set; } = "";
        public string Designation { get; set; } = "";
        public string Department { get; set; } = "";

        public string BankName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public string PanNumber { get; set; } = "";

        public string Month { get; set; } = "";
        public int Year { get; set; }

        public decimal Basic { get; set; }
        public decimal HRA { get; set; }
        public decimal Conveyance { get; set; }
        public decimal MedicalAllowance { get; set; }
        public decimal SpecialAllowance { get; set; }

        public decimal GrossSalary { get; set; }

        public decimal PF { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal LopDeduction { get; set; }
        public decimal OtherDeduction { get; set; }

        public decimal TotalDeductions { get; set; }
        public decimal NetSalary { get; set; }

        public decimal PresentDays { get; set; }
        public int PaidLeaveDays { get; set; }
        public int LopDays { get; set; }
        public int Holidays { get; set; }
        public int Weekends { get; set; }

        public decimal PayableDays { get; set; }
        public int PayrollDays { get; set; }
    }
}