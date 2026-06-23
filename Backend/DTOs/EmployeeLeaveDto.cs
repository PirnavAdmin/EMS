using System;

public class EmployeeLeaveDto
{

    public string? LeaveType { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? Reason { get; set; }
    public DateOnly? AppliedDate { get; set; }
}
