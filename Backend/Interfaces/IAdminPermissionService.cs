using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IAdminPermissionService
    {
        Task<string> SavePermissions(SaveAdminPermissionDto dto);

        Task<object> GetPermissions(int adminId);
        Task<object> GetAllowedModules(int adminId);
    }
}