using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class TaxProof
    {
        [Key]
        public int ProofId { get; set; }

        public int ItemId { get; set; }

        public string FileName { get; set; }

        public string FilePath { get; set; }

        public DateTime UploadedOn { get; set; }

        public string Status { get; set; }
    }
}