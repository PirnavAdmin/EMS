using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("OnboardingEducation")]
    public class OnboardingEducation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OnboardingId { get; set; }

        [ForeignKey(nameof(OnboardingId))]
        public OnboardingCandidate OnboardingCandidate { get; set; }

        public string? Qualification { get; set; }

        public string? Institution { get; set; }

        public string? University { get; set; }

        public int? YearOfPassing { get; set; }

        public decimal? Percentage { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}