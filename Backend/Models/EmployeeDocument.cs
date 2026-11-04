using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("EmployeeDocuments")]
    public class EmployeeDocument
    {
        [Key]
        public int Id { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public string Document_Type { get; set; } = string.Empty;

        public string File_Name { get; set; } = string.Empty;

        public string File_Path { get; set; } = string.Empty;

        public decimal File_Size_MB { get; set; }

        public string Verification_Status { get; set; } = "Pending";

        public string? Remarks { get; set; }

        public DateTime Uploaded_Date { get; set; }

        public string? Verified_By { get; set; }

        public DateTime? Verified_Date { get; set; }
    }
}