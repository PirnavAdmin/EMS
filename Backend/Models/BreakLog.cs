using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class BreakLog
    {
        [Key]
        public int Id { get; set; }

        public int AttendanceId { get; set; }

        public string EmployeeId { get; set; }

        public DateTime BreakStart { get; set; }

        public DateTime? BreakEnd { get; set; }

        public int BreakMinutes { get; set; }

        public Attendance Attendance { get; set; }
    }
}
