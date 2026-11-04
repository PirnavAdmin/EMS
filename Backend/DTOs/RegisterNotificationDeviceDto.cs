using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models.DTOs
{
    public class RegisterNotificationDeviceDto
    {
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
    }
}