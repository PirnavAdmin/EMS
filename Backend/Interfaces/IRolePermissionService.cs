using EmployeeManagementSystem.DTOs;

public interface IRolePermissionService
{
    Task SavePermissions(SaveRolePermissionDto dto);

    Task<List<RolePermissionResponseDto>> GetPermissions(string roleName); // ✅ changed

    Task<List<object>> GetAllowedModules(int roleId);
}