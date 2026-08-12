using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    public class Appraisal
    {
        [Key]
        public int AppraisalId { get; set; }

        public string Employee_Id { get; set; } = string.Empty;

        public int PerformanceCycleId { get; set; }

        public int SelfRating { get; set; }

        public int ManagerRating { get; set; }

        public int FinalRating { get; set; }

        public string? ManagerRemarks { get; set; }

        public string? HRRemarks { get; set; }

        public bool PromotionRecommended { get; set; }

        public decimal SalaryHikePercentage { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime? ReviewedOn { get; set; }

        [ForeignKey(nameof(PerformanceCycleId))]
        public PerformanceCycle? PerformanceCycle { get; set; }
    }
}