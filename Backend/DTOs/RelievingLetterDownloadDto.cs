namespace EmployeeManagementSystem.DTOs
{
    public class RelievingLetterDownloadDto
    {
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();

        public string FileName { get; set; } = "";
    }
}
