using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftService
    {
        Task<IEnumerable<ShiftResponseDto>> GetAllAsync();

        Task<ShiftResponseDto?> GetByIdAsync(int shiftId);

        Task<string> CreateAsync(CreateShiftDto dto);

        Task<string> UpdateAsync(UpdateShiftDto dto);

        Task<string> DeleteAsync(int shiftId);
    }
}