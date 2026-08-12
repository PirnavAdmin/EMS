public class CreateShiftSwapDto
{
    public string FromEmployeeId { get; set; } = "";
    public string ToEmployeeId { get; set; } = "";
    public DateTime ShiftDate { get; set; }
    public int ShiftId { get; set; }
    public string? Reason { get; set; }
}