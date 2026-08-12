namespace EmployeeManagementSystem.DTOs
{
    public class GenerateAllPayslipDto
    {
        public int Year { get; set; }

        public List<string> Months { get; set; } = new();

        public List<string> EmployeeIds { get; set; } = new();
    }
}