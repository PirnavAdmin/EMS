using System;
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class UserNotificationDevice
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string EmployeeId { get; set; } = string.Empty;
        [Required]
        [MaxLength(200)]
        public string InstallationId { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string Platform { get; set; } = "android";

        [Required]
        [MaxLength(30)]
        public string Provider { get; set; } = "fcm";

        [Required]
        [MaxLength(500)]
        public string DeviceToken { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}