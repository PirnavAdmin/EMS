namespace EmployeeManagementSystem.DTOs
{
    public class OfferLetterRequestDto
    {
        // ============================
        // CANDIDATE DETAILS
        // ============================

        public string Candidate_Name { get; set; }

        public string? Candidate_Title { get; set; }

        public string Email { get; set; }

        // Complete address in one field
        public string Address { get; set; }

        // NEW - Candidate phone shown in offer letter
        public string? CandidatePhone { get; set; }


        // ============================
        // EMPLOYMENT DETAILS
        // ============================

        public string Position { get; set; }

        // NEW
        public string? Department { get; set; }

        public DateTime Joining_Date { get; set; }

        // NEW
        //public string? ReportingManager { get; set; }

        //// NEW
        //public string? OfficeLocation { get; set; }

        //// NEW
        //public string? WorkLocation { get; set; }


        //// ============================
        //// OFFER TERMS
        //// ============================

        //// Example: "6 Months"
        //public string? ProbationPeriod { get; set; }

        //// Example: "1 Month"
        //public string? ProbationNoticePeriod { get; set; }

        //// Example: "2 Months"
        //public string? PostConfirmationNoticePeriod { get; set; }

        //// Offer must be accepted before this date
        //public DateTime? AcceptanceDeadline { get; set; }

        //public string? Phone { get; set; }
        //// ============================
        //// AUTHORIZED SIGNATORY
        //// ============================

        //public string? AuthorizedSignatory { get; set; }

        //public string? AuthorizedSignatoryDesignation { get; set; }


        // ============================
        // CTC
        // ============================

        public decimal CTC_Annual { get; set; }


        // ============================
        // SALARY COMPONENTS
        // ============================

        public decimal? Basic { get; set; }

        public decimal? HRA { get; set; }

        public decimal? Conveyance { get; set; }

        public decimal? MedicalAllowance { get; set; }

        public decimal? OtherAllowance { get; set; }

        public decimal? ProfessionalTax { get; set; }

        public decimal? ProvidentFund { get; set; }


        // ============================
        // NEW ANNEXURE COMPONENTS
        // ============================

        //public decimal? Gratuity { get; set; }

        //public decimal? PerformanceIncentive { get; set; }

        //public int Company_Id { get; set; }//vishnu change for multiple companies (multi-tenant),
    }
}