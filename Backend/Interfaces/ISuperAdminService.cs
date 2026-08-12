using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces

{

    public interface ISuperAdminService

    {

        Task<object> Login(SuperAdminLoginDto dto);
        Task<SuperAdminDashboardDto> GetDashboard();

    }

}
