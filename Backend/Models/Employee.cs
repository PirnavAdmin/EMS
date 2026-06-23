using EmployeeManagementSystem.Models;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.Models
{
    [Table("Employees")]
    public class Employee
    {
        [Key]

        public int Id { get; set; }

        [Required]
        [Column("Employee_Id")]
        public string Employee_Id { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; }= string.Empty;

        [Required]
        public string Department { get; set; }=string.Empty;
        

        [Required]
        public string RoleName { get; set; } =string.Empty;
        public int? RoleId {  get; set; }

        [Required]
        public string Status { get; set; }=string.Empty;
        public string? Email { get; set; }
        public decimal CTC { get; set; }

        public DateTime JoiningDate { get; set; }

        [Column("Department_Id")]
        public string? Department_Id { get; set; }
        public string? Branch_Id {  get; set; }
        public string? Password { get; set; }

        [JsonIgnore]
        public ICollection<EmployeePersonalInfo> PersonalInfos { get; set; }
        [JsonIgnore]
        public EmployeeBankDetail BankDetails { get; set; }
    }

}
