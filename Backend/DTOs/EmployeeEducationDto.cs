using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeEducationDto
    {
        [Required]
        public string Employee_Id { get; set; }

        public string Degree { get; set; }

        public string UniversityBoard { get; set; }

        public int? YearOfPassing { get; set; }

        public string PercentageCGPA { get; set; }

        public string Specialization { get; set; }
    }
}
