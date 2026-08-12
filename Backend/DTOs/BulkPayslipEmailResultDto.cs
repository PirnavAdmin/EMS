namespace EmployeeManagementSystem.DTOs
{
    public class BulkPayslipEmailResultDto
    {
        public int TotalPayslips { get; set; }

        public int SentCount { get; set; }

        public int FailedCount { get; set; }

        public List<string> FailedEmployees { get; set; } = new();
    }
}