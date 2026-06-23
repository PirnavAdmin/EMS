using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Clients")]
public class Client
{
    [Key]
    public int Id { get; set; }   // Internal only

    [Required]
    public string Client_Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Location { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public int Active_Projects { get; set; } = 0;

    public DateTime CreatedAt { get; set; }  // DB default
}