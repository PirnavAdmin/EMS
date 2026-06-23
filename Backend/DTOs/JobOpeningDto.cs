public class JobOpeningDto
{
    public string Job_Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string? Experience { get; set; }
    public int? Positions { get; set; }
    public string? Skills { get; set; }
    public string Status { get; set; } = string.Empty;
}