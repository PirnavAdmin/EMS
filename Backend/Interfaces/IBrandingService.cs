using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IBrandingService
    {
        Task<BrandingResponseDto> GetBrandingAsync(int companyId);

        Task<BrandingResponseDto> CreateBrandingAsync(CreateBrandingDto dto);

        Task<BrandingResponseDto> UpdateBrandingAsync(UpdateBrandingDto dto);

        Task<bool> DeleteBrandingAsync(int brandingId);
    }
}