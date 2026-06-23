namespace EmployeeManagementSystem.DTOs
{
    public class HolidayDto
    {
        public int Id { get; set; }
        public string Holiday_Name { get; set; } = string.Empty;
        public DateTime Holiday_Date { get; set; }
        public string? Day { get; set; }
        public string Type { get; set; } = string.Empty;
    }
}
