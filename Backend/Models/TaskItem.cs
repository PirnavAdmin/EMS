using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("TaskManagement")]
public class TaskManagement
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column("Task_Title")]
    public string? TaskTitle { get; set; }

    public string? Project { get; set; }

    [Required]
    public string? Priority { get; set; }

    [Required]
    public string? Status { get; set; }

    [Column("Due_Date")]
    public DateTime? DueDate { get; set; }

    [Required]
    [Column("Assigned_To")]
    public string? AssignedTo { get; set; }
    public string? Description {  get; set; }

    public DateTime CreatedAt { get; set; }
}
