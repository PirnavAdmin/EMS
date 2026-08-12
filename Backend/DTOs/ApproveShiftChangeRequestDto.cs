namespace EmployeeManagementSystem.DTOs
{
    public class ApproveShiftChangeRequestDto
    {
        public int RequestId { get; set; }

        public bool Approve { get; set; }

        public string ApprovedBy { get; set; } = "";
    }
}