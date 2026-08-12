namespace EmployeeManagementSystem.DTOs
{
    public class ClearanceResponseDto
    {
        public int ClearanceId { get; set; }

        public int ResignationId { get; set; }

        public string ITStatus { get; set; }

        public string AdminStatus { get; set; }

        public string FinanceStatus { get; set; }

        public string HRStatus { get; set; }

        public DateTime? CompletedDate { get; set; }
    }
}