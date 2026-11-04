using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class GoalReview
    {
        [Key]
        public int ReviewId { get; set; }

        public int GoalId { get; set; }

        public string Reviewer { get; set; } = string.Empty;

        public string ReviewComments { get; set; } = string.Empty;

        public int Rating { get; set; }

        public DateTime ReviewedOn { get; set; } = DateTime.Now;

        [ForeignKey(nameof(GoalId))]
        public EmployeeGoal? Goal { get; set; }
    }
}