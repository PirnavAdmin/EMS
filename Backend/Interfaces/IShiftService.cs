using EmployeeManagementSystem.DTOs;
using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftService
    {
        Task<IEnumerable<ShiftResponseDto>> GetAllAsync(ClaimsPrincipal user);

        Task<ShiftResponseDto?> GetByIdAsync(int shiftId, ClaimsPrincipal user);

        Task<string> CreateAsync(CreateShiftDto dto, ClaimsPrincipal user);

        Task<string> UpdateAsync(UpdateShiftDto dto, ClaimsPrincipal user);

        Task<string> DeleteAsync(int shiftId, ClaimsPrincipal user);
    }
}
