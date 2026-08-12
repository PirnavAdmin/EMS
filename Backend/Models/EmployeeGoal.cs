using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class EmployeeGoal
    {
        [Key]
        public int GoalId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public int PerformanceCycleId { get; set; }

        public string GoalTitle { get; set; } = string.Empty;

        public string GoalDescription { get; set; } = string.Empty;

        public decimal Weightage { get; set; }

        public string TargetValue { get; set; } = string.Empty;

        public string AchievementValue { get; set; } = string.Empty;

        public decimal ProgressPercentage { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        [ForeignKey(nameof(PerformanceCycleId))]
        public PerformanceCycle? PerformanceCycle { get; set; }
    }
}