using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("emailpurposemappings")]
    public class EmailPurposeMapping
    {
        [Key]
        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Purpose { get; set; } = string.Empty;

        public int SenderAccountId { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class EmailPurposes
    {
        public const string DemoRequestNotification = "DemoRequestNotification";
        public const string DemoRequestReply = "DemoRequestReply";
        public const string General = "General";
    }
}
