using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.DTOs
{
    public class OnboardingDetailsDto
    {
        public OnboardingPersonalInfo? PersonalInfo { get; set; }

        public List<OnboardingEducation> Education { get; set; } = new();

        public List<OnboardingExperience> Experience { get; set; } = new();

        public List<OnboardingDocument> Documents { get; set; } = new();
    }
}