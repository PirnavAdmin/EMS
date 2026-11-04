using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class OnboardingEducationDto
    {
        public string? OnboardingId { get; set; }

        [Required]
        public string Qualification { get; set; }

        [Required]
        public string Institution { get; set; }

        public string? University { get; set; }

        public int? YearOfPassing { get; set; }

        public decimal? Percentage { get; set; }
    }
}