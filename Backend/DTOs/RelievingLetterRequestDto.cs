namespace EmployeeManagementSystem.DTOs
{
    public class RelievingLetterRequestDto
    {
        // Existing Employee ID
        public string EmployeeId { get; set; } = string.Empty;

        // Mr. / Mrs. / Miss. (Selected in Frontend)
        public string Title { get; set; } = string.Empty;

        // Last Working Date
        public DateTime RelievingDate { get; set; }
    }
}