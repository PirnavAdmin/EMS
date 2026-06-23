using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeePersonalInfo")]
    public class EmployeePersonalInfo
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column("Employee_Id")]
        public string Employee_Id { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string AadhaarNumber { get; set; } = string.Empty;
        public string PanNumber { get; set; } = string.Empty;
        public string BloodGroup { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? Marital_Status {get;set;} = string.Empty;
        public string? Department {  get; set; } 
        public string? Designation {  get; set; } 
        public string? Gender {get; set;} 
        public string? Location {  get; set;} = string.Empty;
        public string? WorkExperience {  get; set;} 
        public DateTime? JoiningDate { get; set; }
        public string? HouseNo { get; set; }
        public string? Street { get; set; }
        public string? City {  get; set; }
        public string? District {  get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Pincode {  get; set; }





        // Navigation

        [JsonIgnore]
        public Employee Employees { get; set; }
    }
}
