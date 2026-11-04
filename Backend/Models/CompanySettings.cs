using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("companysettings")]
    public class CompanySettings

    {

        [Key]

        public int Id { get; set; }

        public string CompanyName { get; set; }

        public string? CompanyShortName { get; set; }

        public string? CompanyEmail { get; set; }

        public string? CompanyPhone { get; set; }

        public string? CompanyWebsite { get; set; }

        public string? CompanyAddress { get; set; }

        public string? LogoUrl { get; set; }

        public string? GSTNumber { get; set; }

        public string? CINNumber { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
