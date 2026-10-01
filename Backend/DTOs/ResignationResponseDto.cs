namespace EmployeeManagementSystem.DTOs

{

    public class ResignationResponseDto

    {

        public int ResignationId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public DateTime ResignationDate { get; set; }

        public DateTime LastWorkingDate { get; set; }

        public int NoticePeriod { get; set; }

        public string? Reason { get; set; }

        // Pending / Approved / Rejected

        public string OverallStatus { get; set; } = "Pending";

        // Who approved

        // HR / Admin / Manager

        public string? ApprovedByRole { get; set; }

        public string? ApprovedBy { get; set; }

        public DateTime? ApprovedDate { get; set; }

        public string? ApprovalRemarks { get; set; }

        // Who rejected

        // HR / Admin / Manager

        public string? RejectedByRole { get; set; }

        public string? RejectedBy { get; set; }

        public DateTime? RejectedDate { get; set; }

        public string? RejectionRemarks { get; set; }

        public DateTime CreatedDate { get; set; }

    }

}
