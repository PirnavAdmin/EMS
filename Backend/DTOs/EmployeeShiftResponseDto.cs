namespace EmployeeManagementSystem.DTOs;

public class EmployeeShiftResponseDto
{
    public int AssignmentId { get; set; }

    public string Employee_Id { get; set; } = string.Empty;

    public int ShiftId { get; set; }

    public string ShiftName { get; set; } = string.Empty;

    public string ShiftCode { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public DateTime EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }

    public bool IsActive { get; set; }
}