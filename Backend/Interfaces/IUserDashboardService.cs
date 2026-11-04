using EmployeeManagementSystem.DTOs;
using System.Security.Claims;

public interface IUserDashboardService
{
    Task<UserDashboardResponseDto> GetUserDashboard(ClaimsPrincipal user);
}