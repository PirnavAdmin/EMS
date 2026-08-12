using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftChangeRequestService
    {
        Task<IEnumerable<ShiftChangeRequest>> GetAllAsync();

        Task<ShiftChangeRequest?> GetByIdAsync(int id);

        Task<bool> CreateAsync(CreateShiftChangeRequestDto dto);

        Task<bool> ApproveAsync(ApproveShiftChangeRequestDto dto);

        Task<bool> DeleteAsync(int id);
    }
}