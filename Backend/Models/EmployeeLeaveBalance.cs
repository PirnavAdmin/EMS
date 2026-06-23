using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("EmployeeLeaveBalance")]
public class EmployeeLeaveBalance
{
    [Key]
    public int Id { get; set; }

    [Column("Employee_Id")]
    public string Employee_Id { get; set; }

    public int Earned_Total { get; set; } = 10;
    public int Earned_Used { get; set; } = 0;

    public int Casual_Total { get; set; } = 12;
    public int Casual_Used { get; set; } = 0;

    public int Sick_Total { get; set; } = 10;
    public int Sick_Used { get; set; } = 0;
}