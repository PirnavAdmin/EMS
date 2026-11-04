using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftSwapService
    {
        Task<IEnumerable<ShiftSwapResponseDto>> GetAllAsync(string? employeeId = null, string? type = null, string? status = null, bool? forAdmin = null, string? role = null, bool includePendingEmployee = false);

        Task<ShiftSwapResponseDto?> GetByIdAsync(int id);

        Task<bool> RequestSwapAsync(CreateShiftSwapDto dto);

        Task<(bool Success, string Message)> RequestSwapDetailedAsync(CreateShiftSwapDto dto, string? loggedInUser = null);

        Task<bool> EmployeeAcceptSwapAsync(int id, string? employeeId = null);

        Task<(bool Success, string Message, string? CurrentStatus)> EmployeeAcceptSwapDetailedAsync(int id, string? employeeId = null);

        Task<bool> EmployeeRejectSwapAsync(int id, string? remarks = null, string? employeeId = null);

        Task<(bool Success, string Message, string? CurrentStatus)> EmployeeRejectSwapDetailedAsync(int id, string? remarks = null, string? employeeId = null);

        Task<bool> AdminApproveSwapAsync(int id, string? approvedBy = null);

        Task<(bool Success, string Message, string? CurrentStatus)> AdminApproveSwapDetailedAsync(int id, string? approvedBy = null);

        Task<bool> AdminRejectSwapAsync(int id, string? remarks = null, string? rejectedBy = null);

        Task<(bool Success, string Message, string? CurrentStatus)> AdminRejectSwapDetailedAsync(int id, string? remarks = null, string? rejectedBy = null);

        Task<bool> AcceptSwapAsync(int id, string? approvedBy = null);

        Task<(bool Success, string Message, string? CurrentStatus)> AcceptSwapDetailedAsync(int id, string? approvedBy = null);

        Task<bool> RejectSwapAsync(int id, string? remarks = null, string? rejectedBy = null);

        Task<(bool Success, string Message, string? CurrentStatus)> RejectSwapDetailedAsync(int id, string? remarks = null, string? rejectedBy = null);

        Task<bool> DeleteAsync(int id);
    }
}

