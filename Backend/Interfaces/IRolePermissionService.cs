using EmployeeManagementSystem.DTOs;

public interface IRolePermissionService
{
    Task SavePermissions(int adminId, SaveRolePermissionDto dto);

    Task<List<RolePermissionResponseDto>> GetPermissions(int adminId, string roleName); // ✅ changed
    Task<List<object>> GetEmployeesByRole(string roleName);
    Task<List<object>> GetAllowedModules(
     int adminId,
     int roleId);
}