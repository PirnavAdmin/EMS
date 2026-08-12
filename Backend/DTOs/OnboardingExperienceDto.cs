using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class OnboardingExperienceDto
    {
        public string? OnboardingId { get; set; }

        [Required]
        public string CompanyName { get; set; }

        [Required]
        public string Designation { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }

        public decimal? YearsOfExperience { get; set; }
    }
}