using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs;

public class CreateShiftDto

{

    [Required]

    public string ShiftCode { get; set; } = string.Empty;

    [Required]

    public string ShiftName { get; set; } = string.Empty;

    [Required]

    public TimeSpan StartTime { get; set; }

    [Required]

    public TimeSpan EndTime { get; set; }

    public TimeSpan? BreakStart { get; set; }

    public TimeSpan? BreakEnd { get; set; }

    public int GraceTimeMinutes { get; set; } = 15;

    public decimal HalfDayHours { get; set; } = 4;

    public decimal FullDayHours { get; set; } = 8;

    public string? WeeklyOff { get; set; }

    public int ShiftEndNextDay { get; set; } = 0;

    public bool IsNightShift { get; set; } = false;

    public decimal ShiftAllowance { get; set; } = 0;

    public decimal OTHoursAfter { get; set; } = 8;

    public decimal MaxOTHours { get; set; } = 4;

    public bool IsFlexibleShift { get; set; } = false;

    public int AutoCheckoutHours { get; set; } = 12;

    public int EarlyCheckInMinutes { get; set; } = 30;

    public int LateCheckoutMinutes { get; set; } = 30;

    public bool IsActive { get; set; } = true;

}
