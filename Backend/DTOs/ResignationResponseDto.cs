namespace EmployeeManagementSystem.DTOs
{
    public class ResignationResponseDto
    {
        public int ResignationId { get; set; }

        public string Employee_Id { get; set; }

        public DateTime ResignationDate { get; set; }

        public DateTime LastWorkingDate { get; set; }

        public int NoticePeriod { get; set; }

        public string? Reason { get; set; }

        public string ManagerStatus { get; set; }

        public string HRStatus { get; set; }

        public string OverallStatus { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}