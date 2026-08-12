namespace EmployeeManagementSystem.DTOs
{
    public class BulkPayslipGenerationResultDto
    {
        public int TotalRequested { get; set; }

        public int GeneratedCount { get; set; }

        public int SkippedCount { get; set; }

        public int FailedCount { get; set; }

        public List<string> GeneratedEmployees { get; set; } = new();

        public List<string> SkippedEmployees { get; set; } = new();

        public List<string> FailedEmployees { get; set; } = new();
    }
}