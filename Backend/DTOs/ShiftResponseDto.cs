namespace EmployeeManagementSystem.DTOs;

public class ShiftResponseDto

{

    public int ShiftId { get; set; }

    public string ShiftCode { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public TimeSpan? BreakStart { get; set; }

    public TimeSpan? BreakEnd { get; set; }

    public int GraceTimeMinutes { get; set; }

    public decimal HalfDayHours { get; set; }

    public decimal FullDayHours { get; set; }

    public string? WeeklyOff { get; set; }

    public int ShiftEndNextDay { get; set; }

    public bool IsNightShift { get; set; }

    public decimal ShiftAllowance { get; set; }

    public decimal OTHoursAfter { get; set; }

    public decimal MaxOTHours { get; set; }

    public bool IsFlexibleShift { get; set; }

    public int AutoCheckoutHours { get; set; }

    public int EarlyCheckInMinutes { get; set; }

    public int LateCheckoutMinutes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedDate { get; set; }

}
