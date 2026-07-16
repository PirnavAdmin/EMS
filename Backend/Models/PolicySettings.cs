using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("policysettings")]
    public class PolicySettings

    {

        [Key]

        public int Id { get; set; }

        public string PolicyType { get; set; } = string.Empty;

        public string PolicyTitle { get; set; } = string.Empty;

        public string PolicyContent { get; set; } = string.Empty;

        public string? Version { get; set; }

        public DateTime? EffectiveFrom { get; set; }

        public bool IsActive { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
