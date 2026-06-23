using EmployeeManagementSystem.Models;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("EmployeeBankDetails")]
public class EmployeeBankDetail
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string? Employee_Id { get; set; }

    public string? Customer_Id { get; set; }

    public string? Bank_Name { get; set; }

    public string? Account_Holder_Name { get; set; }

    public string? Account_Number { get; set; }

    public string? IFSC_Code { get; set; }

    public string? Branch_Name { get; set; }

    public string? UAN_Number { get; set; }

    public string? PF_Account_Number { get; set; }

    public DateTime CreatedAt { get; set; }


    [JsonIgnore]
    public Employee Employee { get; set; }
}