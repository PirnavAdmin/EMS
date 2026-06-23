namespace EmployeeManagementSystem.DTOs
{
    public class OfferLetterResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public byte[]? PdfBytes { get; set; }
    }
}
