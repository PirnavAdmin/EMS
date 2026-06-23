using System;
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class UpdateCompanyDto
    {
        [Required]
        public string CompanyName { get; set; }

        public DateTime? EstablishedDate { get; set; }

        [Phone]
        public string PhoneNumber { get; set; }

        [EmailAddress]
        public string EmailAddress { get; set; }

        public string GSTNumber { get; set; }

        public string TINNumber { get; set; }

        public string PANNumber { get; set; }

        
        public int TotalBranches { get; set; }
    }
}