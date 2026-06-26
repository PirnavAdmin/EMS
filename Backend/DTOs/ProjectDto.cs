using EmployeeManagementSystem.DTOs;
using System.ComponentModel.DataAnnotations;

public class ProjectDto
{
    
    public int Id { get; set; }
    public string Project_Name { get; set; }
        = string.Empty;

    public string Project_Id { get; set; }
        = string.Empty;

    public string? Client { get; set; }

    public int? ClientId { get; set; }

    public DateTime? Start_Date { get; set; }

    public DateTime? End_Date { get; set; }

    // EMP001,EMP002
    public string? Team_Members { get; set; }

    // Actual members
    public List<ProjectMemberDto>? ProjectMembers { get; set; }
        = new();

    public string Status { get; set; }
        = string.Empty;
}