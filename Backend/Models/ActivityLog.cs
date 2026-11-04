using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class ActivityLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        public string Activity { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
