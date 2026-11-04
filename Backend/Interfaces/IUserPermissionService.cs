using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IUserPermissionService
    {
        Task SavePermissions(SaveUserPermissionDto dto);

        Task<List<RolePermissionResponseDto>> GetPermissions(string employeeId);

        Task<List<object>> GetAllowedModules(string employeeId);
    }
}