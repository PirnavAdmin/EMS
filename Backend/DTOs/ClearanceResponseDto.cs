namespace EmployeeManagementSystem.DTOs

{

    public class ClearanceResponseDto

    {

        public int ClearanceId { get; set; }

        public int ResignationId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public string EmployeeName { get; set; } = string.Empty;

        public DateTime? ResignationDate { get; set; }

        public DateTime? LastWorkingDate { get; set; }

        public string? ResignationStatus { get; set; }

        // Department clearance

        public string ITStatus { get; set; } = "Pending";

        public string? ITRemarks { get; set; }

        public string AdminStatus { get; set; } = "Pending";

        public string? AdminRemarks { get; set; }

        public string FinanceStatus { get; set; } = "Pending";

        public string? FinanceRemarks { get; set; }

        public string HRStatus { get; set; } = "Pending";

        public string? HRRemarks { get; set; }

        public DateTime? CompletedDate { get; set; }

        // Asset summary

        public int TotalAssets { get; set; }

        public int PendingAssets { get; set; }

        // Task summary

        public int TotalTasks { get; set; }

        public int PendingTasks { get; set; }

        // Project summary

        public int TotalProjects { get; set; }

    }

}
