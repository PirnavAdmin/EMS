// varsha - Audit logging service contract
using EmployeeManagementSystem.DTOs;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IAuditLogService
    {
        // varsha - Log entity creation
        Task LogCreateAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? newValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null);

        // varsha - Log entity update with changed field delta
        Task LogUpdateAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null);

        // varsha - Log entity deletion
        Task LogDeleteAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? oldValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null);

        // varsha - Log custom business action
        Task LogActionAsync(
            string action,
            string module,
            string? entityName = null,
            string? entityId = null,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            int statusCode = 200,
            string? organizationCode = null,
            ClaimsPrincipal? user = null);

        // varsha - Retrieve filtered and paginated audit logs for authenticated Organization Admin
        Task<AuditLogPagedResult<AuditLogResponseDto>> GetAuditLogsAsync(
            ClaimsPrincipal user,
            AuditLogQueryParameters queryParams);

        // varsha - Retrieve audit log details by ID strictly within organization boundary
        Task<AuditLogResponseDto?> GetAuditLogByIdAsync(
            ClaimsPrincipal user,
            long id);

        // varsha - Retrieve activity summary metrics for Organization Admin
        Task<AuditLogSummaryDto> GetAuditSummaryAsync(
            ClaimsPrincipal user);

        // varsha - Export filtered audit logs to CSV
        Task<byte[]> ExportAuditLogsCsvAsync(
            ClaimsPrincipal user,
            AuditLogQueryParameters queryParams);

        Task LogAsync(
            string action,
            string module,
            string? entityId = null,
            string? description = null,
            string? oldValue = null,
            string? newValue = null,
            ClaimsPrincipal? user = null,
            string? ipAddress = null);

        Task LogStatusChangeAsync(
            string entityType,
            string entityId,
            string? previousStatus,
            string newStatus,
            string? reason = null,
            ClaimsPrincipal? user = null);

        Task CreateSuperAdminNotificationAsync(
            string title,
            string message,
            string type = "Info");
    }
}
