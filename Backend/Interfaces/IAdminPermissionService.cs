using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IAdminPermissionService
    {
        Task<string> SavePermissions(SaveAdminPermissionDto dto);

        Task<object> GetPermissions(int adminId);
        Task<object> GetAllowedModules(int adminId);

        // varsha - Check if Admin has permission to access Audit Logs
        Task<bool> HasAuditLogsPermissionAsync(int adminId);

        // varsha - Super Admin grant or revoke Audit Logs permission for a specific Organization Admin
        Task<bool> SetAuditLogsPermissionAsync(int adminId, bool canAccess);

        // varsha - Get current Audit Logs permission status for an Admin
        Task<AdminAuditLogsPermissionStatusDto> GetAuditLogsPermissionStatusAsync(int adminId);
    }
}
