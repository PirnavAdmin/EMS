namespace EmployeeManagementSystem.DTOs
{
    public class LeaveApprovalDto
    {
        public int RequestId { get; set; }

        public string Decision { get; set; } = string.Empty;

        public string? ApprovalRemarks { get; set; }
    }
}