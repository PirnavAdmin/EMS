namespace EmployeeManagementSystem.DTOs
{
    public class OfferLetterSendStatusDto
    {
        public int OfferLetterId { get; set; }

        public string CandidateName { get; set; }

        public string Position { get; set; }

        public bool IsSent { get; set; }

        public int SentCount { get; set; }

        public DateTime? SentOn { get; set; }

        public string Status { get; set; }
    }
}
