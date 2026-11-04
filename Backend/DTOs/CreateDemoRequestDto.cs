using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateDemoRequestDto
    {
        [Required, StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required, EmailAddress, StringLength(254)]
        public string Email { get; set; } = string.Empty;

        [StringLength(30)]
        public string? Phone { get; set; }

        [StringLength(200)]
        public string? Company { get; set; }

        [Required, StringLength(2000)]
        public string Message { get; set; } = string.Empty;
    }

    public class ReplyDemoRequestDto
    {
        [Required, StringLength(2000)]
        public string Reply { get; set; } = string.Empty;
    }
}
