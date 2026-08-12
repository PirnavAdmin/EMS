namespace EmployeeManagementSystem.DTOs
{
    public class CreateEmployeeWeeklyOffDto
    {
        public string Employee_Id { get; set; } = "";

        public string DayName { get; set; } = "";

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }
    }
}