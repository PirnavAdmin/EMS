using EmployeeManagementSystem.Models;
using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ILeaveBalanceService
    {
        Task<(int PaidLeaves, int LopDays)> ApproveLeaveAsync(EmployeeLeave leave);

        Task RestoreLeaveAsync(EmployeeLeave leave);
        Task<object?> GetLeaveBalanceByEmployeeId(string employeeId);
        Task<object?> GetMyLeaveBalance(ClaimsPrincipal user);
    }
}
