namespace EmployeeManagementSystem.DTOs
{
    public class BulkUploadResultDto
    {
        public int TotalRecords { get; set; }

        public int SuccessCount { get; set; }

        public int FailedCount { get; set; }

        public List<string> Errors { get; set; } = new();
    }
}