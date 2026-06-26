//using System.ComponentModel.DataAnnotations;
//using System.ComponentModel.DataAnnotations.Schema;

//namespace EmployeeManagementSystem.Models
//{
//    public class TeamMember
//    {
//        [Key]
//        public int Id { get; set; }

//        public int TeamId { get; set; }

//        // Stores P001, P259 etc.
//        public string EmployeeId { get; set; } = string.Empty;

//        [ForeignKey(nameof(TeamId))]
//        public Team? Team { get; set; }

//        [ForeignKey(nameof(EmployeeId))]
//        [InverseProperty(nameof(Employee.TeamMembers))]
//        public Employee? Employee { get; set; }
//        public TeamMemberOverride? TeamMemberOverride { get; set; }
//    }
//}