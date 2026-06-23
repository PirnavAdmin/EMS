using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeEducation")]
    public class EmployeeEducation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("Employee_Id")]
        public string Employee_Id { get; set; }

        public string Degree { get; set; }

        [Column("University/Board")]
        public string UniversityBoard { get; set; }

        public int? YearOfPassing { get; set; }

        [Column("Percentage/CGPA")]
        public string PercentageCGPA { get; set; }

        public string Specialization { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
