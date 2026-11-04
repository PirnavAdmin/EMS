using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("systemsettings")]

    public class SystemSetting

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public string SettingKey { get; set; } = string.Empty;

        public string? SettingValue { get; set; }

        public string? Description { get; set; }

        public string? GroupName { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? UpdatedBy { get; set; }

    }

}

