using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{
    [Table("attendancesettings")]
    public class AttendanceSettings

    {

        [Key]

        public int Id { get; set; }

        public TimeSpan OfficeStartTime { get; set; }

        public TimeSpan OfficeEndTime { get; set; }

        public TimeSpan CheckInStartTime { get; set; }

        public TimeSpan LateAfterTime { get; set; }

        public TimeSpan CheckoutTime { get; set; }

        public int HalfDayHours { get; set; }

        public DateTime UpdatedAt { get; set; }

    }

}
