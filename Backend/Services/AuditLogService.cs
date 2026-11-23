using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;

        public AuditLogService(AppDbContext context)
        {
            _context = context;
        }

        private async Task<int?> ResolveOrgIdAsync(ClaimsPrincipal? user)
        {
            if (user == null) return null;

            var orgId = CurrentUserHelper.GetOrganizationId(user);
            if (orgId.HasValue && orgId.Value > 0) return orgId.Value;

            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int aid) && aid > 0)
            {
                var admin = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == aid);
                if (admin?.OrganizationId != null && admin.OrganizationId > 0) return admin.OrganizationId.Value;
            }

            var empId = CurrentUserHelper.GetEmployeeId(user);
            if (!string.IsNullOrWhiteSpace(empId))
            {
                var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == empId);
                if (emp?.OrganizationId != null && emp.OrganizationId > 0) return emp.OrganizationId.Value;
            }

            return null;
        }

        public async Task LogAsync(
            string action,
            string module,
            string? entityId = null,
            string? description = null,
            string? oldValue = null,
            string? newValue = null,
            ClaimsPrincipal? user = null,
            string? ipAddress = null)
        {
            try
            {
                string? userId = null;
                string? userName = null;
                string? userRole = null;
                int? orgId = null;

                if (user != null)
                {
                    userId = user.FindFirst("SuperAdminId")?.Value
                        ?? user.FindFirst("AdminId")?.Value
                        ?? user.FindFirst("EmployeeId")?.Value
                        ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                    userName = user.FindFirst(ClaimTypes.Name)?.Value
                        ?? user.FindFirst(ClaimTypes.Email)?.Value;

                    userRole = user.FindFirst(ClaimTypes.Role)?.Value;

                    orgId = await ResolveOrgIdAsync(user);
                }

                var audit = new AuditLog
                {
                    OrganizationId = orgId,
                    UserId = userId,
                    UserName = userName,
                    UserRole = userRole,
                    Action = action,
                    Module = module,
                    EntityId = entityId,
                    Description = description,
                    OldValue = oldValue,
                    NewValue = newValue,
                    IpAddress = ipAddress,
                    CreatedAt = DateTime.UtcNow
                };

                _context.AuditLogs.Add(audit);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Never allow audit logging failure to crash main operations
                Console.WriteLine($"[AuditLogError] {ex.Message}");
            }
        }

        public async Task LogStatusChangeAsync(
            string entityType,
            string entityId,
            string? previousStatus,
            string newStatus,
            string? reason = null,
            ClaimsPrincipal? user = null)
        {
            try
            {
                string? userId = null;
                string? userRole = null;
                int? orgId = null;

                if (user != null)
                {
                    userId = user.FindFirst("SuperAdminId")?.Value
                        ?? user.FindFirst("AdminId")?.Value
                        ?? user.FindFirst("EmployeeId")?.Value;

                    userRole = user.FindFirst(ClaimTypes.Role)?.Value;

                    orgId = await ResolveOrgIdAsync(user);
                }

                var statusLog = new StatusChangeLog
                {
                    OrganizationId = orgId,
                    EntityType = entityType,
                    EntityId = entityId,
                    PreviousStatus = previousStatus,
                    NewStatus = newStatus,
                    ChangedByUserId = userId,
                    ChangedByRole = userRole,
                    Reason = reason,
                    CreatedAt = DateTime.UtcNow
                };

                _context.StatusChangeLogs.Add(statusLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[StatusLogChangeError] {ex.Message}");
            }
        }

        public async Task CreateSuperAdminNotificationAsync(
            string title,
            string message,
            string type = "Info")
        {
            try
            {
                var notification = new SuperAdminNotification
                {
                    Title = title,
                    Message = message,
                    Type = type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SuperAdminNotifications.Add(notification);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SuperAdminNotificationError] {ex.Message}");
            }
        }
    }
}
