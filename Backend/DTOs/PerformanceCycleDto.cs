namespace EmployeeManagementSystem.DTOs
{
    public class CreatePerformanceCycleDto
    {
        public string CycleName { get; set; } = string.Empty;
        public string FinancialYear { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}