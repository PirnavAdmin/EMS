using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.DTOs
{
    public class CreateShiftChangeRequestDto
    {
        private string _employeeId = string.Empty;

        [JsonPropertyName("employee_Id")]
        public string Employee_Id
        {
            get => _employeeId;
            set => _employeeId = value ?? string.Empty;
        }

        [JsonPropertyName("employeeId")]
        public string? EmployeeId
        {
            get => _employeeId;
            set { if (!string.IsNullOrWhiteSpace(value)) _employeeId = value; }
        }

        [JsonPropertyName("empId")]
        public string? EmpId
        {
            get => _employeeId;
            set { if (!string.IsNullOrWhiteSpace(value)) _employeeId = value; }
        }

        [JsonPropertyName("currentShiftId")]
        public int CurrentShiftId { get; set; }

        private int _requestedShiftId;

        [JsonPropertyName("requestedShiftId")]
        public int RequestedShiftId
        {
            get => _requestedShiftId;
            set => _requestedShiftId = value;
        }

        [JsonPropertyName("newShiftId")]
        public int? NewShiftId
        {
            get => _requestedShiftId;
            set { if (value.HasValue && value.Value > 0) _requestedShiftId = value.Value; }
        }

        [JsonPropertyName("targetShiftId")]
        public int? TargetShiftId
        {
            get => _requestedShiftId;
            set { if (value.HasValue && value.Value > 0) _requestedShiftId = value.Value; }
        }

        [JsonPropertyName("shiftId")]
        public int? ShiftId
        {
            get => _requestedShiftId;
            set { if (value.HasValue && value.Value > 0 && _requestedShiftId == 0) _requestedShiftId = value.Value; }
        }

        private DateTime _effectiveFrom;

        [JsonPropertyName("effectiveFrom")]
        public DateTime EffectiveFrom
        {
            get => _effectiveFrom;
            set => _effectiveFrom = value;
        }

        [JsonPropertyName("fromDate")]
        public DateTime? FromDate
        {
            get => _effectiveFrom;
            set { if (value.HasValue && value.Value != default) _effectiveFrom = value.Value; }
        }

        [JsonPropertyName("startDate")]
        public DateTime? StartDate
        {
            get => _effectiveFrom;
            set { if (value.HasValue && value.Value != default) _effectiveFrom = value.Value; }
        }

        private DateTime? _effectiveTo;

        [JsonPropertyName("effectiveTo")]
        public DateTime? EffectiveTo
        {
            get => _effectiveTo;
            set => _effectiveTo = value;
        }

        [JsonPropertyName("toDate")]
        public DateTime? ToDate
        {
            get => _effectiveTo;
            set { if (value.HasValue) _effectiveTo = value; }
        }

        [JsonPropertyName("endDate")]
        public DateTime? EndDate
        {
            get => _effectiveTo;
            set { if (value.HasValue) _effectiveTo = value; }
        }

        [JsonPropertyName("isPermanent")]
        public bool IsPermanent { get; set; }

        private string? _reason;

        [JsonPropertyName("reason")]
        public string? Reason
        {
            get => _reason;
            set => _reason = value;
        }

        [JsonPropertyName("remarks")]
        public string? Remarks
        {
            get => _reason;
            set { if (!string.IsNullOrWhiteSpace(value)) _reason = value; }
        }
    }
}