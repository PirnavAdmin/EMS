using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

[Table("Assets")]
public class Asset
{
    [Key]
   
    public int Id { get; set; }

    [Required]
    [Column("Asset_Name")]
    public string? AssetName { get; set; }

    [Required]
    [Column("Serial_No")]
    public string? SerialNo { get; set; }

    [Required]
    public string? Status { get; set; }

    [Column("Assigned_To")]
    public string? AssignedTo { get; set; }
    public string? ImagePaths { get; set; }

    [Column("Description")]
    public string? Description { get; set; }

    [JsonIgnore]
    public DateTime CreatedAt { get; set; }
}
