using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("OnboardingPersonalInfo")]
    public class OnboardingPersonalInfo
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OnboardingId { get; set; }

        [ForeignKey(nameof(OnboardingId))]
        public OnboardingCandidate OnboardingCandidate { get; set; }

        public string? FirstName { get; set; }

        public string? MiddleName { get; set; }

        public string? LastName { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? PanNumber { get; set; }

        public string? BloodGroup { get; set; }

        public string? Marital_Status { get; set; }

        public string? Gender { get; set; }

        public DateTime? JoiningDate { get; set; }

        public string? Location { get; set; }

        public string? WorkExperience { get; set; }

        public string? Department { get; set; }

        public string? Designation { get; set; }

        public string? HouseNo { get; set; }

        public string? Street { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Country { get; set; }

        public string? Pincode { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}