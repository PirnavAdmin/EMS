using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("OfferLetters")]
    public class OfferLetter
    {
        public int Id { get; set; }
        public string Candidate_Name { get; set; }
        public string Email { get; set; }   // NEW
        public string Address { get; set; }
        public string Position { get; set; }
        public string? Department { get; set; }
        public DateTime Joining_Date { get; set; }
        public decimal CTC_Annual { get; set; }
        public DateTime Generated_On { get; set; }
        public string Candidate_Title { get; set; }
        public string? File_Path { get; set; }
    }
}
