using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs;

public class AssignShiftDto
{
    [Required]
    public string Employee_Id { get; set; } = string.Empty;

    [Required]
    public int ShiftId { get; set; }

    [Required]
    public DateTime EffectiveFrom { get; set; }

    public DateTime? EffectiveTo { get; set; }
}