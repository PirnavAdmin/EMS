namespace EmployeeManagementSystem.DTOs
{
    public class ApproveShiftSwapDto
    {
        public int SwapId { get; set; }

        public bool Approve { get; set; }

        public string ApprovedBy { get; set; } = "";
    }
}