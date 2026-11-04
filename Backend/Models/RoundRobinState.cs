using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("RoundRobinState")]
    public class RoundRobinState
    {
        [Key]
        public int Id { get; set; }

        public int ProjectId { get; set; }

        public string Technology { get; set; } = string.Empty;

        public string? LastAssignedEmployee { get; set; }

        public DateTime? LastAssignedAt { get; set; }
    }
}