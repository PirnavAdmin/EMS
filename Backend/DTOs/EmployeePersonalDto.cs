using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs
{
    public class EmployeePersonalInfoDto
    {
        [Required]
        public string Employee_Id { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        public string? MiddleName { get; set; }

        [Required]
        public string LastName { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        [Required]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string AadhaarNumber { get; set; } = string.Empty;

        [Required]
        public string PanNumber { get; set; } = string.Empty;

        public string BloodGroup { get; set; } = string.Empty;
        public string? Marital_Status { get; set; } = string.Empty;
        public string? Department {  get; set; }
        public string? Designation {  get; set; } 
        
        public string? Gender { get; set; } 
        public string? Location { get; set; } = string.Empty;
        public string? HouseNo {  get; set; } 
        public string? Street { get; set; }
        public string? City {  get; set; }
        public string? District {  get; set; }
        public string? State {  get; set; } 
        public string? Country { get; set; }
        public string? Pincode {  get; set; } 
        public string? WorkExperience { get; set; } 
        public DateTime? JoiningDate { get; set; }

    }
}
