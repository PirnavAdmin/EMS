using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EmployeeManagementSystem.Models
{
    [Table("PaySlips")]
    public class PaySlip
    {
        public int Id { get; set; }

        public string EmployeeId { get; set; }

        [Column("CTC_Annual")]
        public decimal? CTC { get; set; }

        public string? FilePath { get; set; }
        public string? Month { get; set; }

        public int? Year { get; set; }

        public DateTime? Generated_On { get; set; }
        public decimal? GrossSalary { get; set; }
        public decimal? TotalDeductions { get; set; }
        public decimal? NetSalary { get; set; }
        public decimal? OtherDeductions { get; set; }


    }
}