namespace EmployeeManagementSystem.DTOs
{
    public class LandingPricingPlanDto
    {
        public int Id { get; set; }
        public string PlanKey { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int? MonthlyPrice { get; set; }
        public int? AnnualPrice { get; set; }
        public string Note { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<string> Features { get; set; } = new();
        public string CtaLabel { get; set; } = string.Empty;
        public string CtaLink { get; set; } = string.Empty;
        public bool IsFeatured { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class UpdateLandingPricingPlanDto
    {
        public string PlanKey { get; set; } = string.Empty;
        public string? Name { get; set; }
        public int? MonthlyPrice { get; set; }
        public int? AnnualPrice { get; set; }
        public string? Note { get; set; }
        public string? Description { get; set; }
        public List<string>? Features { get; set; }
        public string? CtaLabel { get; set; }
        public string? CtaLink { get; set; }
        public bool? IsFeatured { get; set; }
        public int? DisplayOrder { get; set; }
    }
}
