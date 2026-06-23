namespace EmployeeManagementSystem.DTOs
{
    public class ManualPaySlipDto
    {
        public string EmployeeId { get; set; } = string.Empty;

        public int Year { get; set; }
        public string Month { get; set; } = string.Empty;

        public int TotalWorkingDays { get; set; }
        public int LOPDays { get; set; }

        public decimal OtherDeductions { get; set; }
    }
}
