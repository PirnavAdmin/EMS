using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("leavesettings")]
    public class LeaveSettings

    {

        [Key]

        public int Id { get; set; }

        public string ApprovalRoles { get; set; }

        public string? ExternalEmails { get; set; }

        public string? CcEmails { get; set; }

        public bool AllowHalfDay { get; set; }

        public int MaxLeaveDays { get; set; }

        public int AdvanceNoticeDays { get; set; }

        public bool AttachmentRequired { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
