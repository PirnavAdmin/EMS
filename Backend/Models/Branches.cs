using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Branches")]
public class Branch
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column("Branch_Name")]
    public string? BranchName { get; set; }

    public DateTime? Established { get; set; }

    [Column("Phone_Number")]
    public string? PhoneNumber { get; set; }
    [EmailAddress]
    public string? Email { get; set; }

  
    [Column("Department_Id")]
    public string? DepartmentId { get; set; }
    public string? Branch_Id {  get; set; }

    
}