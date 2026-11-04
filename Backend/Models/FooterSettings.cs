using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models;

public class FooterSettings
{
    [Key]
    public int FooterId { get; set; }

    public int Company_Id { get; set; }

    public string? FooterText { get; set; }

    public string? FooterLink { get; set; }

    public string? CopyrightText { get; set; }

    public string? ProductVersion { get; set; }

    public string? SupportEmail { get; set; }

    public string? SupportPhone { get; set; }

    public DateTime? UpdatedDate { get; set; }
}