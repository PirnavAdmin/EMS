namespace EmployeeManagementSystem.Models
{
    public class TeamReportingDay
    {
        public int Id { get; set; }

        public int TeamId { get; set; }

        public string DayName { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public Team Team { get; set; }
    }
}