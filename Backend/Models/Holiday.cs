using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Holidays")]
public class Holiday
{
    [Key]
    public int Id { get; set; }   // Internal only

    [Required]
    public string Holiday_Name { get; set; } = string.Empty;

    [Required]
    public DateTime Holiday_Date { get; set; }

    public string? Day { get; set; }

    [Required]
    public string Type { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }   // Auto from DB
}