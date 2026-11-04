namespace EmployeeManagementSystem.Models
{
    public class OnboardingCandidate
    {
        public int Id { get; set; }

        public string OnboardingId { get; set; }

        public string FullName { get; set; }

        public string Email { get; set; }

        public string Password { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    }
}
