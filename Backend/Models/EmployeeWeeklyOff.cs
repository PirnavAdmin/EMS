using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeWeeklyOff")]
    public class EmployeeWeeklyOff
    {
        [Key]
        public int WeeklyOffId { get; set; }

        [Required]
        public string Employee_Id { get; set; } = "";

        [Required]
        public string DayName { get; set; } = "";

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}