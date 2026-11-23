// varsha - Production-ready multi-tenant audit logging service
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor; // varsha - automatic request context capture
        private readonly ITenantService _tenantService; // varsha - tenant resolution and isolation

        public AuditLogService(
            AppDbContext context,
            IHttpContextAccessor httpContextAccessor,
            ITenantService tenantService)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _tenantService = tenantService;
        }

        // varsha - Automatically capture request and user context and persist audit log in tenant database
        private async Task LogActionCoreAsync(
            string action,
            string module,
            string? entityName,
            string? entityId,
            string? description,
            object? oldValues,
            object? newValues,
            int statusCode,
            string? organizationCode,
            ClaimsPrincipal? user)
        {
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                var effectiveUser = user ?? httpContext?.User;

                // 1. Resolve User information
                string? userId = null;
                string? userName = null;
                string? userRole = null;

                if (effectiveUser != null)
                {
                    userId = effectiveUser.FindFirst("AdminId")?.Value
                        ?? effectiveUser.FindFirst("EmployeeId")?.Value
                        ?? effectiveUser.FindFirst("SuperAdminId")?.Value
                        ?? effectiveUser.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                    userName = effectiveUser.FindFirst(ClaimTypes.Name)?.Value
                        ?? effectiveUser.FindFirst(ClaimTypes.Email)?.Value;

                    userRole = effectiveUser.FindFirst(ClaimTypes.Role)?.Value;
                }

                // 2. Resolve Organization Code
                string resolvedOrgCode = organizationCode?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(resolvedOrgCode) && effectiveUser != null)
                {
                    resolvedOrgCode = (await _tenantService.ResolveOrganizationCodeAsync(effectiveUser)) ?? string.Empty;
                }

                if (string.IsNullOrWhiteSpace(resolvedOrgCode))
                {
                    resolvedOrgCode = "DEFAULT";
                }

                // 3. Resolve HTTP Request details
                string? ipAddress = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? httpContext?.Connection.RemoteIpAddress?.ToString();

                string? userAgent = httpContext?.Request.Headers["User-Agent"].ToString();
                string? requestMethod = httpContext?.Request.Method;
                string? requestPath = httpContext?.Request.Path.Value;

                string? correlationId = httpContext?.Request.Headers["X-Correlation-ID"].FirstOrDefault()
                    ?? httpContext?.TraceIdentifier
                    ?? Guid.NewGuid().ToString();

                // 4. Sanitize and compute delta for values
                string? oldValuesJson;
                string? newValuesJson;

                if (string.Equals(action, "Update", StringComparison.OrdinalIgnoreCase) && oldValues != null && newValues != null)
                {
                    var delta = AuditSanitizer.ComputeDelta(oldValues, newValues);
                    oldValuesJson = delta.oldValuesJson;
                    newValuesJson = delta.newValuesJson;
                }
                else
                {
                    oldValuesJson = AuditSanitizer.Sanitize(oldValues);
                    newValuesJson = AuditSanitizer.Sanitize(newValues);
                }

                // 5. Create AuditLog entity
                var auditLog = new AuditLog
                {
                    OrganizationCode = resolvedOrgCode,
                    UserId = userId,
                    UserName = userName,
                    UserRole = userRole,
                    Action = action,
                    Module = module,
                    EntityName = entityName,
                    EntityId = entityId,
                    Description = description,
                    OldValues = oldValuesJson,
                    NewValues = newValuesJson,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    RequestMethod = requestMethod,
                    RequestPath = requestPath,
                    StatusCode = statusCode,
                    CorrelationId = correlationId,
                    CreatedAt = DateTime.UtcNow
                };

                // 6. Save in tenant database (ems_tenant_{organizationCode})
                if (resolvedOrgCode != "DEFAULT")
                {
                    try
                    {
                        await _tenantService.EnsureTenantDatabaseAndAuditTableAsync(resolvedOrgCode);
                        using var tenantContext = _tenantService.CreateTenantDbContext(resolvedOrgCode);
                        tenantContext.AuditLogs.Add(auditLog);
                        await tenantContext.SaveChangesAsync();
                        return; // Successfully stored in tenant database
                    }
                    catch (Exception exTenant)
                    {
                        Console.WriteLine($"[TenantAuditDbNotice] Failed to save in tenant database: {exTenant.Message}. Falling back to default database.");
                    }
                }

                // 7. Fallback to current database if tenant database is DEFAULT or unreachable
                _context.AuditLogs.Add(auditLog);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // varsha - Audit logging failures must never crash primary business transactions
                Console.WriteLine($"[AuditLogError] {ex.Message}");
            }
        }

        // varsha - Log entity creation
        public async Task LogCreateAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? newValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null)
        {
            await LogActionCoreAsync(
                action: "Create",
                module: module,
                entityName: entityName,
                entityId: entityId,
                description: description ?? $"Created {entityName} with ID {entityId}",
                oldValues: null,
                newValues: newValues,
                statusCode: 201,
                organizationCode: organizationCode,
                user: user);
        }

        // varsha - Log entity update with changed field delta
        public async Task LogUpdateAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null)
        {
            await LogActionCoreAsync(
                action: "Update",
                module: module,
                entityName: entityName,
                entityId: entityId,
                description: description ?? $"Updated {entityName} with ID {entityId}",
                oldValues: oldValues,
                newValues: newValues,
                statusCode: 200,
                organizationCode: organizationCode,
                user: user);
        }

        // varsha - Log entity deletion
        public async Task LogDeleteAsync(
            string module,
            string entityName,
            string entityId,
            string? description = null,
            object? oldValues = null,
            string? organizationCode = null,
            ClaimsPrincipal? user = null)
        {
            await LogActionCoreAsync(
                action: "Delete",
                module: module,
                entityName: entityName,
                entityId: entityId,
                description: description ?? $"Deleted {entityName} with ID {entityId}",
                oldValues: oldValues,
                newValues: null,
                statusCode: 200,
                organizationCode: organizationCode,
                user: user);
        }

        // varsha - Log custom business action
        public async Task LogActionAsync(
            string action,
            string module,
            string? entityName = null,
            string? entityId = null,
            string? description = null,
            object? oldValues = null,
            object? newValues = null,
            int statusCode = 200,
            string? organizationCode = null,
            ClaimsPrincipal? user = null)
        {
            await LogActionCoreAsync(
                action: action,
                module: module,
                entityName: entityName,
                entityId: entityId,
                description: description,
                oldValues: oldValues,
                newValues: newValues,
                statusCode: statusCode,
                organizationCode: organizationCode,
                user: user);
        }

        // varsha - Retrieve filtered and paginated audit logs for authenticated Organization Admin
        public async Task<AuditLogPagedResult<AuditLogResponseDto>> GetAuditLogsAsync(
            ClaimsPrincipal user,
            AuditLogQueryParameters queryParams)
        {
            var orgCode = await _tenantService.ResolveOrganizationCodeAsync(user);
            if (string.IsNullOrWhiteSpace(orgCode))
            {
                throw new UnauthorizedAccessException("Organization context could not be resolved from token.");
            }

            await _tenantService.EnsureTenantDatabaseAndAuditTableAsync(orgCode);
            using var tenantContext = _tenantService.CreateTenantDbContext(orgCode);

            var query = tenantContext.AuditLogs
                .AsNoTracking()
                .Where(a => a.OrganizationCode == orgCode);

            // Database-level filters
            if (queryParams.StartDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= queryParams.StartDate.Value);
            }

            if (queryParams.EndDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt <= queryParams.EndDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Module))
            {
                var mod = queryParams.Module.Trim().ToLower();
                query = query.Where(a => a.Module.ToLower() == mod);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Action))
            {
                var act = queryParams.Action.Trim().ToLower();
                query = query.Where(a => a.Action.ToLower() == act);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.UserId))
            {
                var uid = queryParams.UserId.Trim();
                query = query.Where(a => a.UserId == uid);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                var s = queryParams.Search.Trim().ToLower();
                query = query.Where(a =>
                    a.Action.ToLower().Contains(s) ||
                    a.Module.ToLower().Contains(s) ||
                    (a.EntityName != null && a.EntityName.ToLower().Contains(s)) ||
                    (a.EntityId != null && a.EntityId.ToLower().Contains(s)) ||
                    (a.Description != null && a.Description.ToLower().Contains(s)) ||
                    (a.UserName != null && a.UserName.ToLower().Contains(s)));
            }

            int totalCount = await query.CountAsync();
            int totalPages = (int)Math.Ceiling((double)totalCount / queryParams.PageSize);

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .Select(a => new AuditLogResponseDto
                {
                    Id = a.Id,
                    OrganizationCode = a.OrganizationCode,
                    UserId = a.UserId,
                    UserName = a.UserName,
                    UserRole = a.UserRole,
                    Action = a.Action,
                    Module = a.Module,
                    EntityName = a.EntityName,
                    EntityId = a.EntityId,
                    Description = a.Description,
                    OldValues = a.OldValues,
                    NewValues = a.NewValues,
                    IpAddress = a.IpAddress,
                    UserAgent = a.UserAgent,
                    RequestMethod = a.RequestMethod,
                    RequestPath = a.RequestPath,
                    StatusCode = a.StatusCode,
                    CorrelationId = a.CorrelationId,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new AuditLogPagedResult<AuditLogResponseDto>
            {
                Items = items,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        // varsha - Retrieve audit log details by ID strictly within organization boundary
        public async Task<AuditLogResponseDto?> GetAuditLogByIdAsync(ClaimsPrincipal user, long id)
        {
            var orgCode = await _tenantService.ResolveOrganizationCodeAsync(user);
            if (string.IsNullOrWhiteSpace(orgCode))
            {
                throw new UnauthorizedAccessException("Organization context could not be resolved from token.");
            }

            await _tenantService.EnsureTenantDatabaseAndAuditTableAsync(orgCode);
            using var tenantContext = _tenantService.CreateTenantDbContext(orgCode);

            var log = await tenantContext.AuditLogs
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id && a.OrganizationCode == orgCode);

            if (log == null) return null;

            return new AuditLogResponseDto
            {
                Id = log.Id,
                OrganizationCode = log.OrganizationCode,
                UserId = log.UserId,
                UserName = log.UserName,
                UserRole = log.UserRole,
                Action = log.Action,
                Module = log.Module,
                EntityName = log.EntityName,
                EntityId = log.EntityId,
                Description = log.Description,
                OldValues = log.OldValues,
                NewValues = log.NewValues,
                IpAddress = log.IpAddress,
                UserAgent = log.UserAgent,
                RequestMethod = log.RequestMethod,
                RequestPath = log.RequestPath,
                StatusCode = log.StatusCode,
                CorrelationId = log.CorrelationId,
                CreatedAt = log.CreatedAt
            };
        }

        // varsha - Retrieve activity summary metrics for Organization Admin
        public async Task<AuditLogSummaryDto> GetAuditSummaryAsync(ClaimsPrincipal user)
        {
            var orgCode = await _tenantService.ResolveOrganizationCodeAsync(user);
            if (string.IsNullOrWhiteSpace(orgCode))
            {
                throw new UnauthorizedAccessException("Organization context could not be resolved from token.");
            }

            await _tenantService.EnsureTenantDatabaseAndAuditTableAsync(orgCode);
            using var tenantContext = _tenantService.CreateTenantDbContext(orgCode);

            var query = tenantContext.AuditLogs
                .AsNoTracking()
                .Where(a => a.OrganizationCode == orgCode);

            int totalActivities = await query.CountAsync();

            int uniqueUsers = await query
                .Where(a => a.UserId != null)
                .Select(a => a.UserId)
                .Distinct()
                .CountAsync();

            var recentActivity = await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => (DateTime?)a.CreatedAt)
                .FirstOrDefaultAsync();

            var modules = await query
                .Select(a => a.Module)
                .Distinct()
                .OrderBy(m => m)
                .ToListAsync();

            var actionCounts = await query
                .GroupBy(a => a.Action)
                .Select(g => new { Action = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Action, x => x.Count);

            return new AuditLogSummaryDto
            {
                TotalActivities = totalActivities,
                UniqueUsers = uniqueUsers,
                RecentActivityTimestamp = recentActivity,
                ModulesTracked = modules,
                ActionWiseCounts = actionCounts
            };
        }

        // varsha - Export filtered audit logs to CSV
        public async Task<byte[]> ExportAuditLogsCsvAsync(ClaimsPrincipal user, AuditLogQueryParameters queryParams)
        {
            var orgCode = await _tenantService.ResolveOrganizationCodeAsync(user);
            if (string.IsNullOrWhiteSpace(orgCode))
            {
                throw new UnauthorizedAccessException("Organization context could not be resolved from token.");
            }

            await _tenantService.EnsureTenantDatabaseAndAuditTableAsync(orgCode);
            using var tenantContext = _tenantService.CreateTenantDbContext(orgCode);

            var query = tenantContext.AuditLogs
                .AsNoTracking()
                .Where(a => a.OrganizationCode == orgCode);

            // Apply same filters
            if (queryParams.StartDate.HasValue)
                query = query.Where(a => a.CreatedAt >= queryParams.StartDate.Value);

            if (queryParams.EndDate.HasValue)
                query = query.Where(a => a.CreatedAt <= queryParams.EndDate.Value);

            if (!string.IsNullOrWhiteSpace(queryParams.Module))
            {
                var mod = queryParams.Module.Trim().ToLower();
                query = query.Where(a => a.Module.ToLower() == mod);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Action))
            {
                var act = queryParams.Action.Trim().ToLower();
                query = query.Where(a => a.Action.ToLower() == act);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.UserId))
            {
                var uid = queryParams.UserId.Trim();
                query = query.Where(a => a.UserId == uid);
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                var s = queryParams.Search.Trim().ToLower();
                query = query.Where(a =>
                    a.Action.ToLower().Contains(s) ||
                    a.Module.ToLower().Contains(s) ||
                    (a.EntityName != null && a.EntityName.ToLower().Contains(s)) ||
                    (a.EntityId != null && a.EntityId.ToLower().Contains(s)) ||
                    (a.Description != null && a.Description.ToLower().Contains(s)) ||
                    (a.UserName != null && a.UserName.ToLower().Contains(s)));
            }

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(5000)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("Id,OrganizationCode,CreatedAt (UTC),UserId,UserName,UserRole,Action,Module,EntityName,EntityId,Description,IpAddress,RequestMethod,RequestPath,StatusCode,CorrelationId");

            foreach (var log in logs)
            {
                sb.AppendLine(string.Join(",",
                    log.Id,
                    EscapeCsv(log.OrganizationCode),
                    EscapeCsv(log.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")),
                    EscapeCsv(log.UserId),
                    EscapeCsv(log.UserName),
                    EscapeCsv(log.UserRole),
                    EscapeCsv(log.Action),
                    EscapeCsv(log.Module),
                    EscapeCsv(log.EntityName),
                    EscapeCsv(log.EntityId),
                    EscapeCsv(log.Description),
                    EscapeCsv(log.IpAddress),
                    EscapeCsv(log.RequestMethod),
                    EscapeCsv(log.RequestPath),
                    log.StatusCode,
                    EscapeCsv(log.CorrelationId)
                ));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "\"\"";
            string escaped = value.Replace("\"", "\"\"");
            return $"\"{escaped}\"";
        }

        // =========================================================================
        // =========================================================================
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
            await LogActionCoreAsync(
                action: action,
                module: module,
                entityName: null,
                entityId: entityId,
                description: description,
                oldValues: oldValue,
                newValues: newValue,
                statusCode: 200,
                organizationCode: null,
                user: user);
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

                if (user != null)
                {
                    userId = user.FindFirst("SuperAdminId")?.Value
                        ?? user.FindFirst("AdminId")?.Value
                        ?? user.FindFirst("EmployeeId")?.Value;

                    userRole = user.FindFirst(ClaimTypes.Role)?.Value;
                }

                var statusLog = new StatusChangeLog
                {
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
