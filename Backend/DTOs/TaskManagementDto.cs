namespace EmployeeManagementSystem.DTOs
{
    public class TaskManagementDto
    {
        public int? OrganizationId { get; set; }
        public string? TaskTitle { get; set; }
        public string? Project { get; set; }
        public string? Priority { get; set; }
        public DateTime? DueDate { get; set; }
        public string? AssignedTo { get; set; }
        public string? Description {  get; set; }
    }

}
