namespace EmployeeManagementSystem.DTOs
{
    public class OfferLetterRequestDto

    {
        public string Candidate_Name { get; set; }
        public string Email { get; set; }   // NEW
        public string Address { get; set; }
        public string Position { get; set; }
        public DateTime Joining_Date { get; set; }
        public decimal CTC_Annual { get; set; }
        public string? Candidate_Title { get; set; }

        public decimal? Basic { get; set; }

        public decimal? HRA { get; set; }

        public decimal? Conveyance { get; set; }

        public decimal? MedicalAllowance { get; set; }

        public decimal? OtherAllowance { get; set; }

        public decimal? ProfessionalTax { get; set; }
        public decimal? ProvidentFund { get; set; }
    }
}
