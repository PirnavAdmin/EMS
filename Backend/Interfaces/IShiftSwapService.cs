using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftSwapService
    {
        Task<IEnumerable<ShiftSwap>> GetAllAsync();

        Task<ShiftSwap?> GetByIdAsync(int id);

        Task<bool> RequestSwapAsync(CreateShiftSwapDto dto);

        Task<bool> ApproveSwapAsync(ApproveShiftSwapDto dto);

        Task<bool> DeleteAsync(int id);
    }
}