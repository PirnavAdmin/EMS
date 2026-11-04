using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.DTOs;

public class CreateBrandingDto
{
    [Required]
    public int Company_Id { get; set; }

    public string? PrimaryColor { get; set; }

    public string? SecondaryColor { get; set; }

    public string? ButtonColor { get; set; }

    public string? FontFamily { get; set; }

    public string? FooterText { get; set; }

    public string? FooterLink { get; set; }

    public string? SupportEmail { get; set; }

    public string? SupportPhone { get; set; }

    public bool IsDarkMode { get; set; }

    public IFormFile? CompanyLogo { get; set; }

    public IFormFile? LoginLogo { get; set; }

    public IFormFile? SidebarLogo { get; set; }

    public IFormFile? LoginBackground { get; set; }

    public IFormFile? Favicon { get; set; }
}