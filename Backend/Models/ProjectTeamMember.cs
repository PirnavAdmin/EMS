namespace EmployeeManagementSystem.Models
{
    public class ProjectTeamMember
    {
        public int Id { get; set; }

        public int ProjectId { get; set; }

        public string EmployeeId { get; set; }

        public string Technology { get; set; }

        public DateTime CreatedAt { get; set; }

        public Project Project { get; set; }

        public Employee Employee { get; set; }
    }
}
