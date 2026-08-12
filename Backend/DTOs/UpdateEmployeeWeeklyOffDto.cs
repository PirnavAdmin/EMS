namespace EmployeeManagementSystem.DTOs
{
    public class UpdateEmployeeWeeklyOffDto
    {
        public string DayName { get; set; } = "";

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public bool IsActive { get; set; }
    }
}