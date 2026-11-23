// varsha - DTOs for Super Admin Audit Logs permission management
namespace EmployeeManagementSystem.DTOs
{
    public class SetAuditLogsPermissionDto
    {
        public bool CanAccess { get; set; } = true;
    }

    public class AdminAuditLogsPermissionStatusDto
    {
        public int AdminId { get; set; }
        public string AdminEmail { get; set; } = string.Empty;
        public bool HasAuditLogsPermission { get; set; }
    }
}
