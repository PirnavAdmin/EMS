using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("JobOpenings")]
public class JobOpening
{
    [Key]
    public int Id { get; set; }   // Internal

    [Required]
    public string Job_Title { get; set; } = string.Empty;

    [Required]
    public string Department { get; set; } = string.Empty;

    public string? Experience { get; set; }

    public int? Positions { get; set; }

    public string? Skills { get; set; }

    [Required]
    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }   // DB default
}