namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeDocumentResponseDto
    {
        public int Id { get; set; }

        public string FileName { get; set; } = string.Empty;

        public string DocumentType { get; set; } = string.Empty;

        public string FileType { get; set; } = string.Empty;

        public decimal FileSizeMB { get; set; }

        public DateTime UploadedDate { get; set; }

        public string VerificationStatus { get; set; } = string.Empty;
    }
}
