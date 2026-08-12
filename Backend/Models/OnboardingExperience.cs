using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("OnboardingExperience")]
    public class OnboardingExperience
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OnboardingId { get; set; }

        [ForeignKey(nameof(OnboardingId))]
        public OnboardingCandidate OnboardingCandidate { get; set; }

        public string? CompanyName { get; set; }

        public string? Designation { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }

        public decimal? YearsOfExperience { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}