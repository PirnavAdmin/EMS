using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftRotationService
    {
        Task<IEnumerable<ShiftRotation>> GetAllAsync();

        Task<ShiftRotation?> GetByIdAsync(int id);

        Task<bool> CreateAsync(CreateShiftRotationDto dto);

        Task<bool> UpdateAsync(int id, UpdateShiftRotationDto dto);

        Task<bool> DeleteAsync(int id);
    }
}