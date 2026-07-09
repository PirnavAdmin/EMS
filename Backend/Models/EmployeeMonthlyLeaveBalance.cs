using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("EmployeeMonthlyLeaveBalance")]
public class EmployeeMonthlyLeaveBalance
{
    [Key]
    public int Id { get; set; }

    [Column("Employee_Id")]
    public string Employee_Id { get; set; }

    public int LeaveYear { get; set; }

    public int LeaveMonth { get; set; }

    public int MonthlyCredit { get; set; } = 1;

    public int CarryForward { get; set; } = 0;

    public int AvailableLeaves { get; set; } = 1;

    public int UsedLeaves { get; set; } = 0;

    public int RemainingLeaves { get; set; } = 1;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}