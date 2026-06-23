using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("AdminNotifications")]
    public class AdminNotification
    {
        [Key]
        public int Id { get; set; }

        public string Title { get; set; }

        public string Message { get; set; }

        public string UserRole { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}