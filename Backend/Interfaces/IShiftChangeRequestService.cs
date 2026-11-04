using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftChangeRequestService
    {
        Task<IEnumerable<ShiftChangeRequest>> GetAllAsync(string? employeeId = null, string? status = null);

        Task<ShiftChangeRequest?> GetByIdAsync(int id);

        Task<bool> CreateAsync(CreateShiftChangeRequestDto dto);

        Task<(bool Success, string Message)> CreateDetailedAsync(CreateShiftChangeRequestDto dto);

        Task<bool> ApproveAsync(int id, string? approvedBy = null);

        Task<bool> RejectAsync(int id, string? remarks = null, string? rejectedBy = null);

        Task<bool> DeleteAsync(int id);
    }
}
