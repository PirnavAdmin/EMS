namespace EmployeeManagementSystem.DTOs
{
    public class EmployeeDocumentChecklistDto
    {
        public string DocumentType { get; set; } = string.Empty;

        public bool Uploaded { get; set; }

        public string? Status { get; set; }
    }
}