//using System.ComponentModel.DataAnnotations;
//using System.ComponentModel.DataAnnotations.Schema;

//namespace EmployeeManagementSystem.Models
//{
//    [Table("Teams")]
//    public class Team
//    {
       
//        [Key]
        
//        public int Id { get; set; }

//        public string TeamNumber { get; set; } = string.Empty;

//        public string TeamName { get; set; } = string.Empty;

//        // Stores P001, P025 etc.i
//        public string ReportingManagerId { get; set; } = string.Empty;

//        public string EngagementType { get; set; } = string.Empty;

//        public int ProjectId { get; set; }

//        public bool IsActive { get; set; } = true;

//        public DateTime CreatedAt { get; set; } = DateTime.Now;

//        [ForeignKey(nameof(ProjectId))]
//        public Project? Project { get; set; }

//        [ForeignKey(nameof(ReportingManagerId))]
//        [InverseProperty(nameof(Employee.ManagedTeams))]
//        public Employee? ReportingManager { get; set; }

//        public ICollection<TeamMember>? Members { get; set; }

//        public ICollection<TeamReportingDay>? ReportingDays { get; set; }
//    }
//}