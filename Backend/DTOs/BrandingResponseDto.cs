namespace EmployeeManagementSystem.DTOs;

public class BrandingResponseDto
{
    public int BrandingId { get; set; }

    public int Company_Id { get; set; }

    public string? CompanyLogo { get; set; }

    public string? LoginLogo { get; set; }

    public string? SidebarLogo { get; set; }

    public string? LoginBackground { get; set; }

    public string? Favicon { get; set; }

    public string? PrimaryColor { get; set; }

    public string? SecondaryColor { get; set; }

    public string? ButtonColor { get; set; }

    public string? FontFamily { get; set; }

    public string? FooterText { get; set; }

    public string? FooterLink { get; set; }

    public string? SupportEmail { get; set; }

    public string? SupportPhone { get; set; }

    public bool IsDarkMode { get; set; }
}