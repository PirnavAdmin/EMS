using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("generalsettings")]
    public class GeneralSettings

    {

        [Key]

        public int Id { get; set; }

        public string? CompanyTimeZone { get; set; }

        public string? DateFormat { get; set; }

        public string? TimeFormat { get; set; }

        public string? CurrencySymbol { get; set; }

        public int SessionTimeout { get; set; }

        public string? FinancialYearStartMonth { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
