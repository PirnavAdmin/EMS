using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("EmployeeLeave")]
public class EmployeeLeave
{
    [Key]
    public int Id { get; set; }

    [Column("Employee_Id")]
    public string? EmployeeId { get; set; }

    [Column("Employee_Name")]
    public string? EmployeeName { get; set; }

    [Column("Leave_Type")]
    public string? LeaveType { get; set; }

    [Column("From_Date")]
    public DateTime FromDate { get; set; }

    [Column("To_Date")]
    public DateTime ToDate { get; set; }

    public string? Reason { get; set; }

    public string? Status { get; set; } = "Pending";
    public string? ManagerStatus { get; set; } = "Pending";

    public string? HRStatus { get; set; } = "Pending";
    public string? ApprovedBy { get; set; }

    public DateTime? ApprovedOn { get; set; }
    public DateOnly? AppliedDate {  get; set; }
    public string? ApprovalToken { get; set; }

    public DateTime CreatedAt { get; set; }
}
