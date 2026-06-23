using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Projects")]
public class Project
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Project_Name { get; set; } = string.Empty;

    [Required]
    public string Project_Id { get; set; } = string.Empty;

    // ✅ NEW: Foreign Key
    public int? ClientId { get; set; }

    // ✅ Navigation Property
    [ForeignKey("ClientId")]
    public Client Client { get; set; }

    public DateTime? Start_Date { get; set; }

    public DateTime? End_Date { get; set; }

    public string? Team_Members { get; set; }

    [Required]
    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}