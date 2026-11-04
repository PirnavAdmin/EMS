using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models;

public class DocumentMaster
{
    [Key]
    public int DocumentId { get; set; }

    public int Company_Id { get; set; }

    public string? DocumentName { get; set; }

    public string? Category { get; set; }

    public string? FileName { get; set; }

    public string? FilePath { get; set; }

    public string? Version { get; set; }

    public bool IsEmployeeVisible { get; set; }

    public DateTime CreatedDate { get; set; }
}