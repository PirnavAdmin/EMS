using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeFullDetailDTO
    {
        public Employee Employee { get; set; }

        public EmployeePersonalInfo PersonalInfo { get; set; }

        public EmployeeBankDetail BankDetails { get; set; }

        public List<EmployeeEducation> Educations { get; set; }

        public List<EmployeeExperience> Experiences { get; set; }
    }
}
