using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("LandingPricingPlans")]
    public class LandingPricingPlan
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string PlanKey { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int? MonthlyPrice { get; set; }

        public int? AnnualPrice { get; set; }

        [MaxLength(100)]
        public string Note { get; set; } = string.Empty;

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public string FeaturesJson { get; set; } = "[]";

        [MaxLength(100)]
        public string CtaLabel { get; set; } = string.Empty;

        [MaxLength(255)]
        public string CtaLink { get; set; } = string.Empty;

        public bool IsFeatured { get; set; } = false;

        public int DisplayOrder { get; set; } = 0;
    }
}
