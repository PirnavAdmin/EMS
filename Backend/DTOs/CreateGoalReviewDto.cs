namespace EmployeeManagementSystem.DTOs
{
    public class CreateGoalReviewDto
    {
        public int GoalId { get; set; }

        public string Reviewer { get; set; } = string.Empty;

        public string? ReviewComments { get; set; }

        public int Rating { get; set; }
    }
}