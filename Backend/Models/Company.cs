using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("Company")]
    public class Company
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("CompanyName")]
        public string CompanyName { get; set; }

        [Column("EstablishedDate")]
        public DateTime? EstablishedDate { get; set; }

        [Column("PhoneNumber")]
        public string PhoneNumber { get; set; }

        [Column("EmailAddress")]
        public string EmailAddress { get; set; }

        [Column("GSTNumber")]
        public string GSTNumber { get; set; }

        [Column("TINNumber")]
        public string TINNumber { get; set; }

        [Column("PANNumber")]
        public string PANNumber { get; set; }

        [Column("TotalBranches")]
        public int TotalBranches { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}