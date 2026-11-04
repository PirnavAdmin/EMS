namespace EmployeeManagementSystem.DTOs
{
    public class CreateEmployeeFromOnboardingDto
    {
        public string Employee_Id { get; set; } = string.Empty;

        public int OnboardingCandidateId { get; set; }

        public string Department { get; set; } = string.Empty;

        public int? RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public decimal CTC { get; set; }

        public DateTime JoiningDate { get; set; }

        public string Status { get; set; } = "Active";
    }
}
