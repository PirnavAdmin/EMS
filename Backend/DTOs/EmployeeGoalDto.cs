namespace EmployeeManagementSystem.DTOs
{
    public class CreateEmployeeGoalDto
    {
        public string Employee_Id { get; set; } = string.Empty;
        public int PerformanceCycleId { get; set; }
        public string GoalTitle { get; set; } = string.Empty;
        public string GoalDescription { get; set; } = string.Empty;
        public decimal Weightage { get; set; }
        public string TargetValue { get; set; } = string.Empty;
    }
}