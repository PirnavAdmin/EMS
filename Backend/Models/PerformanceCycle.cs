using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class PerformanceCycle
    {
        [Key]
        public int PerformanceCycleId { get; set; }

        public string CycleName { get; set; } = string.Empty;

        public string FinancialYear { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public string Status { get; set; } = "Open";

        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}