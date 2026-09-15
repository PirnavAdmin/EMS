using System;
using Microsoft.AspNetCore.Http;

public class EmployeeLeaveDto
{

    public string? LeaveType { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string? Reason { get; set; }
   
    public DateOnly? AppliedDate { get; set; }
    public string? ApprovalRemark { get; set; }
    public IFormFile? Attachment { get; set; }
    public List<string>? ExternalApproverEmails { get; set; }
}
