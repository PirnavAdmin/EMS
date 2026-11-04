namespace EmployeeManagementSystem.DTOs
{
    public class ExperienceLetterRequestDto
    {
        public string EmployeeId { get; set; } = string.Empty;

        // Mr. / Mrs. / Ms. / Miss.
        public string Title { get; set; } = string.Empty;

        // Optional - DB designation used if null
        public string? Designation { get; set; }

        // Currently entered from Swagger
        public string? Department { get; set; }

        // Last working date
        public DateTime EndDate { get; set; }

        public string? AuthorizedSignatory { get; set; }

        public string? AuthorizedSignatoryDesignation { get; set; }
    }
}