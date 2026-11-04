using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class EmailSenderAccountRequest
    {
        [Required, EmailAddress, MaxLength(320)]
        public string SenderEmail { get; set; } = string.Empty;

        // Required when creating; optional when updating to retain the existing password.
        public string? SenderPassword { get; set; }

        [Required, MaxLength(255)]
        public string SmtpHost { get; set; } = string.Empty;

        [Range(1, 65535)]
        public int SmtpPort { get; set; } = 587;
        public bool EnableSSL { get; set; } = true;
        public string DisplayName { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    public class EmailPurposeMappingRequest
    {
        [Required, MaxLength(100)]
        public string Purpose { get; set; } = string.Empty;
        [Range(1, int.MaxValue)]
        public int SenderAccountId { get; set; }
    }
}
