using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.DTOs
{
    public class ApproveShiftSwapDto
    {
        [JsonPropertyName("swapId")]
        public int? SwapId { get; set; }

        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("requestId")]
        public int? RequestId { get; set; }

        [JsonPropertyName("approve")]
        public bool? Approve { get; set; }

        [JsonPropertyName("isApproved")]
        public bool? IsApproved { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("action")]
        public string? Action { get; set; }

        [JsonPropertyName("approvedBy")]
        public string? ApprovedBy { get; set; }

        [JsonPropertyName("rejectedBy")]
        public string? RejectedBy { get; set; }

        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }

        [JsonIgnore]
        public int ResolvedSwapId => SwapId ?? Id ?? RequestId ?? 0;

        [JsonIgnore]
        public bool ResolvedIsApprove
        {
            get
            {
                if (Approve.HasValue) return Approve.Value;
                if (IsApproved.HasValue) return IsApproved.Value;
                if (!string.IsNullOrWhiteSpace(Status))
                {
                    return Status.Equals("Approved", StringComparison.OrdinalIgnoreCase) ||
                           Status.Equals("Accepted", StringComparison.OrdinalIgnoreCase);
                }
                if (!string.IsNullOrWhiteSpace(Action))
                {
                    return Action.Equals("approve", StringComparison.OrdinalIgnoreCase) ||
                           Action.Equals("accept", StringComparison.OrdinalIgnoreCase);
                }
                return true; // Default to true if calling approve endpoint
            }
        }

        [JsonIgnore]
        public string ResolvedUser => ApprovedBy ?? RejectedBy ?? "Admin";

        [JsonIgnore]
        public string? ResolvedRemarks => Remarks ?? Reason;
    }
}
