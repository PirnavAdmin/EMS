namespace EmployeeManagementSystem.DTOs
{
    public class RelievingLetterRequestDto
    {
        public string EmployeeId { get; set; } = string.Empty;

        public string EmployeeName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string Designation { get; set; } = string.Empty;

        public DateTime? JoiningDate { get; set; }

        public DateTime RelievingDate { get; set; }

        public DateTime GeneratedDate { get; set; }
    }
}