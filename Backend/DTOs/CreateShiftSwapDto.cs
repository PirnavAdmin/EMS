using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateShiftSwapDto
    {
        // --- Requester / From Employee candidates ---
        [JsonPropertyName("fromEmployeeId")]
        public string? FromEmployeeId { get; set; }

        [JsonPropertyName("fromEmployee_Id")]
        public string? FromEmployee_Id { get; set; }

        [JsonPropertyName("fromEmployee")]
        public string? FromEmployee { get; set; }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId { get; set; }

        [JsonPropertyName("employee_Id")]
        public string? Employee_Id { get; set; }

        [JsonPropertyName("empId")]
        public string? EmpId { get; set; }

        [JsonPropertyName("senderId")]
        public string? SenderId { get; set; }

        [JsonPropertyName("requesterId")]
        public string? RequesterId { get; set; }

        [JsonPropertyName("requestingEmployeeId")]
        public string? RequestingEmployeeId { get; set; }

        [JsonPropertyName("sourceEmployeeId")]
        public string? SourceEmployeeId { get; set; }

        [JsonPropertyName("fromId")]
        public string? FromId { get; set; }

        // --- Target / To Employee candidates ---
        [JsonPropertyName("toEmployeeId")]
        public string? ToEmployeeId { get; set; }

        [JsonPropertyName("toEmployee_Id")]
        public string? ToEmployee_Id { get; set; }

        [JsonPropertyName("toEmployee")]
        public string? ToEmployee { get; set; }

        [JsonPropertyName("withEmployeeId")]
        public string? WithEmployeeId { get; set; }

        [JsonPropertyName("swapWithEmployeeId")]
        public string? SwapWithEmployeeId { get; set; }

        [JsonPropertyName("swapWith")]
        public string? SwapWith { get; set; }

        [JsonPropertyName("swapTo")]
        public string? SwapTo { get; set; }

        [JsonPropertyName("swapToEmployeeId")]
        public string? SwapToEmployeeId { get; set; }

        [JsonPropertyName("targetEmployeeId")]
        public string? TargetEmployeeId { get; set; }

        [JsonPropertyName("targetId")]
        public string? TargetId { get; set; }

        [JsonPropertyName("receiverId")]
        public string? ReceiverId { get; set; }

        [JsonPropertyName("requestedEmployeeId")]
        public string? RequestedEmployeeId { get; set; }

        [JsonPropertyName("toId")]
        public string? ToId { get; set; }

        // --- Dates ---
        [JsonPropertyName("shiftDate")]
        public DateTime? ShiftDate { get; set; }

        [JsonPropertyName("date")]
        public DateTime? Date { get; set; }

        [JsonPropertyName("swapDate")]
        public DateTime? SwapDate { get; set; }

        [JsonPropertyName("forDate")]
        public DateTime? ForDate { get; set; }

        [JsonPropertyName("fromDate")]
        public DateTime? FromDate { get; set; }

        [JsonPropertyName("effectiveFrom")]
        public DateTime? EffectiveFrom { get; set; }

        [JsonPropertyName("targetDate")]
        public DateTime? TargetDate { get; set; }

        // --- Shifts ---
        [JsonPropertyName("shiftId")]
        public int? ShiftId { get; set; }

        [JsonPropertyName("fromShiftId")]
        public int? FromShiftId { get; set; }

        [JsonPropertyName("currentShiftId")]
        public int? CurrentShiftId { get; set; }

        // --- Reasons ---
        [JsonPropertyName("reason")]
        public string? Reason { get; set; }

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("comments")]
        public string? Comments { get; set; }
    }
}