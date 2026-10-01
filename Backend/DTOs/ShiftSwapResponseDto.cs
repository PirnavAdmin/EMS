namespace EmployeeManagementSystem.DTOs
{
    public class ShiftSwapResponseDto
    {
        public int SwapId { get; set; }

        public string FromEmployeeId { get; set; } = string.Empty;

        public string FromEmployeeName { get; set; } = string.Empty;

        public string ToEmployeeId { get; set; } = string.Empty;

        public string ToEmployeeName { get; set; } = string.Empty;

        public DateTime ShiftDate { get; set; }

        public int ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public int? ToShiftId { get; set; }

        public string? ToShiftName { get; set; }

        public string? Reason { get; set; }

        public string Status { get; set; } = "Pending";

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
