using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeExperience")]
    public class EmployeeExperience
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("Employee_Id")]
        public string Employee_Id { get; set; }

        [Column("Company_Name")]
        public string CompanyName { get; set; }

        public string Designation { get; set; }

        [Column("From_Date")]
        public DateTime? FromDate { get; set; }

        [Column("To_Date")]
        public DateTime? ToDate { get; set; }

       

        [Column("Reason_For_Leaving")]
        public string ReasonForLeaving { get; set; }

        public string Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
