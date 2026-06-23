public class EmployeeDocumentDto
{
    public string EmployeeId { get; set; } = string.Empty;

    public string DocumentType { get; set; } = string.Empty;

    public List<IFormFile>? Files { get; set; }
}