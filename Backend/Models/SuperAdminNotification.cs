using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("superadminnotifications")]

    public class SuperAdminNotification

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public string Title { get; set; } = string.Empty;

        [Required]

        public string Message { get; set; } = string.Empty;

        public string? Type { get; set; } = "Info"; // "Info", "Warning", "Alert", "Success"

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }

}

