using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class TeamMemberOverride
    {
        [Key]
        public int Id { get; set; }

        public int TeamMemberId { get; set; }

        public bool IsCrossMapped { get; set; }

        public bool DifferentProject { get; set; }

        public bool CustomReportingDays { get; set; }

        public int? OverrideProjectId { get; set; }

        [ForeignKey(nameof(TeamMemberId))]

        public bool CustomShift { get; set; } = false;

        public int? OverrideShiftId { get; set; }

        [ForeignKey(nameof(OverrideShiftId))]
        public ShiftMaster? OverrideShift { get; set; }

        public TeamMember? TeamMember { get; set; }

        [ForeignKey(nameof(OverrideProjectId))]
        public Project? OverrideProject { get; set; }

    }
}