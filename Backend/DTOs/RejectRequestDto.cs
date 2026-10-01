using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.DTOs
{
    public class RejectRequestDto
    {
        [JsonPropertyName("remarks")]
        public string? Remarks { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }

        [JsonPropertyName("comments")]
        public string? Comments { get; set; }

        [JsonPropertyName("rejectedBy")]
        public string? RejectedBy { get; set; }

        [JsonPropertyName("approvedBy")]
        public string? ApprovedBy { get; set; }

        [JsonPropertyName("user")]
        public string? User { get; set; }

        [JsonPropertyName("by")]
        public string? By { get; set; }

        [JsonPropertyName("swapId")]
        public int? SwapId { get; set; }

        [JsonPropertyName("id")]
        public int? Id { get; set; }

        [JsonPropertyName("requestId")]
        public int? RequestId { get; set; }

        [JsonIgnore]
        public string? ResolvedRemarks => Remarks ?? Reason ?? Comments;

        [JsonIgnore]
        public string? ResolvedUser => RejectedBy ?? ApprovedBy ?? User ?? By;

        [JsonIgnore]
        public int ResolvedId => SwapId ?? Id ?? RequestId ?? 0;
    }
}

