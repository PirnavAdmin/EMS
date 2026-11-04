using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class LandingSettings
    {
        [Key]
        public int Id { get; set; }

        public string? LogoUrl { get; set; }
        // Additive: email displayed on the public landing-page footer.
        [MaxLength(320)]
        public string? ContactEmail { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}

