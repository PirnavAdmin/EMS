public class CreateShiftChangeRequestDto
{
    public string Employee_Id { get; set; } = "";
    public int CurrentShiftId { get; set; }
    public int RequestedShiftId { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsPermanent { get; set; }
    public string? Reason { get; set; }
}