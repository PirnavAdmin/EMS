using System.ComponentModel.DataAnnotations;
namespace EmployeeManagementSystem.DTOs
{
    public class LandingPageContactEmailDto
    {
        [Required]
        [EmailAddress]
        [MaxLength(320)]
        public string ContactEmail { get; set; } = string.Empty;
    }
}