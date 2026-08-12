namespace EmployeeManagementSystem.DTOs
{
    public class GenerateBulkPayslipDto
    {
        public int Year { get; set; }

        public string Month { get; set; } = string.Empty;

        public List<string> EmployeeIds { get; set; } = new();
    }
}