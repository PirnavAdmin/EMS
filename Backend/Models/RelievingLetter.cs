using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("RelievingLetter")]
    public class RelievingLetter
    {
        public int Id { get; set; }

        public string EmployeeId { get; set; }

        public string Title { get; set; }

        public DateTime RelievingDate { get; set; }

        public DateTime GeneratedDate { get; set; }

        public string? DocxPath { get; set; }

        public string? PdfPath { get; set; }

        public string Status { get; set; } = "Draft";

        public DateTime? SentOn { get; set; }
        public bool IsSent { get; set; } = false;

        public int SentCount { get; set; } = 0;
        public DateTime CreatedAt { get; set; }
        public string? EmployeeName { get; set; }

        public string? Email { get; set; }

        public string? Designation { get; set; }

        public DateTime? JoiningDate { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }
    }
}