using Microsoft.AspNetCore.Http;

namespace EmployeeManagementSystem.DTOs;

public class UpdateBrandingDto : CreateBrandingDto
{
    public int BrandingId { get; set; }
}