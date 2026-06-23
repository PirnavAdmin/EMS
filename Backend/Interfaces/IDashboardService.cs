using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardResponseDto> GetDashboardData();
    }
}