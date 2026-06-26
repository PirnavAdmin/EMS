//using System.ComponentModel.DataAnnotations;
//using System.ComponentModel.DataAnnotations.Schema;

//namespace EmployeeManagementSystem.Models
//{
//    public class TeamMemberReportingDay
//    {
//        [Key]
//        public int Id { get; set; }

//        public int TeamMemberId { get; set; }

//        public string DayName { get; set; } = string.Empty;

//        [ForeignKey(nameof(TeamMemberId))]
//        public TeamMember? TeamMember { get; set; }
//    }
//}