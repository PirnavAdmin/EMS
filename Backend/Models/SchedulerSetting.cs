using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("SchedulerSettings")]
    public class SchedulerSetting
    {
        [Key]
        public int Id { get; set; }

        public string SettingKey { get; set; } = string.Empty;

        public string SettingValue { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}