namespace EmployeeManagementSystem.DTOs
{
    public class CreateAppraisalDto
    {
        public string Employee_Id { get; set; } = string.Empty;
        public int PerformanceCycleId { get; set; }
        public int SelfRating { get; set; }
        public string? ManagerRemarks { get; set; }
    }
}