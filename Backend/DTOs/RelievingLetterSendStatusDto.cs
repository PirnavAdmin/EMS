namespace EmployeeManagementSystem.DTOs
{
    public class RelievingLetterSendStatusDto
    {
        public int RelievingLetterId { get; set; }

        public string EmployeeId { get; set; }

        public string EmployeeName { get; set; }

        public bool IsSent { get; set; }

        public int SentCount { get; set; }

        public string Status { get; set; }

        public DateTime? SentOn { get; set; }
    }
}
