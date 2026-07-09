using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ILeaveBalanceService
    {
        Task<(int PaidLeaves, int LopDays)> ApproveLeaveAsync(EmployeeLeave leave);

        Task RestoreLeaveAsync(EmployeeLeave leave);
    }
}
