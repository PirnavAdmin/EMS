namespace EmployeeManagementSystem.DTOs
{
    public class ExperienceLetterDownloadDto
    {
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();

        public string FileName { get; set; } = string.Empty;
    }
}