using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("notificationsettings")]
    public class NotificationSettings

    {

        [Key]

        public int Id { get; set; }

        public bool EnableEmailNotifications { get; set; }

        public bool EnableAttendanceEmails { get; set; }

        public bool EnableLeaveEmails { get; set; }

        public bool EnableWFHEmails { get; set; }

        public bool EnableTicketEmails { get; set; }

        public bool EnableAssetEmails { get; set; }

        public bool EnableOfferLetterEmails { get; set; }

        public bool EnablePayslipEmails { get; set; }

        public bool EnableLocationMismatchEmails { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
