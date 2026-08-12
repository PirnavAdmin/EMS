using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("ShiftMaster")]
    public class ShiftMaster
    {
        [Key]
        public int ShiftId { get; set; }

        [Required]
        [MaxLength(20)]
        public string ShiftCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string ShiftName { get; set; } = string.Empty;

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }

        public TimeSpan? BreakStart { get; set; }

        public TimeSpan? BreakEnd { get; set; }

        public int GraceTimeMinutes { get; set; } = 15;

        [Column(TypeName = "decimal(5,2)")]
        public decimal HalfDayHours { get; set; } = 4.00m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal FullDayHours { get; set; } = 8.00m;

        [MaxLength(20)]
        public string? WeeklyOff { get; set; }

        public int ShiftEndNextDay { get; set; } = 0;

        public bool IsNightShift { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public DateTime? UpdatedDate { get; set; }

        // Shift Allowance
        [Column(TypeName = "decimal(10,2)")]
        public decimal ShiftAllowance { get; set; } = 0;

        // Overtime starts after these many hours
        [Column(TypeName = "decimal(5,2)")]
        public decimal OTHoursAfter { get; set; } = 8;

        // Maximum OT allowed
        [Column(TypeName = "decimal(5,2)")]
        public decimal MaxOTHours { get; set; } = 4;

        // Flexible Shift
        public bool IsFlexibleShift { get; set; } = false;

        // Auto checkout after this many hours
        public int AutoCheckoutHours { get; set; } = 12;

        // Allow Early Check-In (Minutes)
        public int EarlyCheckInMinutes { get; set; } = 30;

        // Allow Late Check-Out (Minutes)
        public int LateCheckoutMinutes { get; set; } = 30;
    }
}