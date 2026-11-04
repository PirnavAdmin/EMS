using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("emailsettings")]
    public class EmailSettings

    {

        [Key]

        public int Id { get; set; }

        // SMTP Configuration

        public string SenderEmail { get; set; } = "";

        public string SenderPassword { get; set; } = "";

        public string SmtpHost { get; set; } = "";

        public int SmtpPort { get; set; }

        public bool EnableSSL { get; set; }

        public string DisplayName { get; set; } = "";

        public DateTime UpdatedAt { get; set; } = DateTime.Now;

    }

}
