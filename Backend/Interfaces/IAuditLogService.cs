using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAuditLogService

    {

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

