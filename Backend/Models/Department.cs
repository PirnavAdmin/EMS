using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Departments")]
public class Department
{
    [Key]
    public int Id { get; set; }

    [Column("Department_Name")]
    public string? DepartmentName { get; set; }

    [Column("Department_Head")]
    public string? DepartmentHead { get; set; }

    [Column("Members_Count")]
    public int MembersCount { get; set; }

    public string? Building { get; set; }

    public string? Status { get; set; }

    [Column("Department_Id")]
    public string? Department_Id { get; set; }

    [Column("CreatedAt")]
    public DateTime? CreatedAt { get; set; }
}