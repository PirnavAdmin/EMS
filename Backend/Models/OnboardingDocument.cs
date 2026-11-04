using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("OnboardingDocuments")]
    public class OnboardingDocument
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OnboardingId { get; set; }

        [ForeignKey(nameof(OnboardingId))]
        public OnboardingCandidate OnboardingCandidate { get; set; }

        public string? DocumentType { get; set; }

        public string? FileName { get; set; }

        public string? FilePath { get; set; }

        public DateTime UploadedOn { get; set; } = DateTime.UtcNow;
    }
}