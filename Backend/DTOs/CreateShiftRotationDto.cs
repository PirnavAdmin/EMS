public class CreateShiftRotationDto
{
    public string Employee_Id { get; set; } = "";
    public string RotationType { get; set; } = "Weekly";
    public int Shift1Id { get; set; }
    public int? Shift2Id { get; set; }
    public int? Shift3Id { get; set; }
    public DateTime EffectiveFrom { get; set; }
}