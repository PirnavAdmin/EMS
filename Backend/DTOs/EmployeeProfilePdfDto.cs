using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeProfilePdfDto
    {
        public Employee Employee { get; set; }

        public EmployeePersonalInfo PersonalInfo { get; set; }

        public EmployeeBankDetail BankDetails { get; set; }

        public List<EmployeeEducation> Educations { get; set; } = new();

        public List<EmployeeExperience> Experiences { get; set; } = new();

        public List<EmployeeDocument> Documents { get; set; } = new();
    }
}