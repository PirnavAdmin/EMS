// varsha - Read-only controller for Organization Admin to query, inspect, and export audit logs
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;
        private readonly ITenantService _tenantService;
        private readonly IAdminPermissionService _adminPermissionService;

        public AuditLogsController(
            IAuditLogService auditLogService,
            ITenantService tenantService,
            IAdminPermissionService adminPermissionService)
        {
            _auditLogService = auditLogService;
            _tenantService = tenantService;
            _adminPermissionService = adminPermissionService;
        }

        private async Task<(bool Allowed, IActionResult? ForbiddenResult)> ValidateOrganizationAdminAccessAsync()
        {
            // 1. Super Admin is strictly forbidden from viewing Organization Audit Logs
            if (User.IsInRole("SuperAdmin") || User.HasClaim(c => c.Type == "SuperAdminId"))
            {
                var forbidden = StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Access denied: Super Admin is not permitted to access Organization Admin Audit Logs API."
                });
                return (false, forbidden);
            }

            // 2. Normal employees without Admin role or AdminId claim are strictly forbidden
            bool isAdmin = User.IsInRole("Admin") || User.HasClaim(c => c.Type == "AdminId");
            if (!isAdmin)
            {
                var forbidden = StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Access denied: Audit logs are accessible ONLY to authenticated Organization Admin users."
                });
                return (false, forbidden);
            }

            // 3. Resolve AdminId from claims
            var adminIdClaim = User.FindFirst("AdminId")?.Value;
            if (string.IsNullOrWhiteSpace(adminIdClaim) || !int.TryParse(adminIdClaim, out int adminId) || adminId <= 0)
            {
                var forbidden = StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Access denied: Unable to verify Organization Admin identity."
                });
                return (false, forbidden);
            }

            // 4. Verify Super Admin has granted Audit Logs permission to this Admin
            bool hasPermission = await _adminPermissionService.HasAuditLogsPermissionAsync(adminId);
            if (!hasPermission)
            {
                var forbidden = StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Access denied: You do not have permission to access Audit Logs. Please contact Super Admin to request access."
                });
                return (false, forbidden);
            }

            return (true, null);
        }

        // =========================================================================
        // =========================================================================
        [HttpGet]
        public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogQueryParameters queryParams)
        {
            var (allowed, forbiddenResult) = await ValidateOrganizationAdminAccessAsync();
            if (!allowed)
            {
                return forbiddenResult!;
            }

            try
            {
                var result = await _auditLogService.GetAuditLogsAsync(User, queryParams);

                return Ok(new
                {
                    success = true,
                    message = "Audit logs retrieved successfully",
                    data = new
                    {
                        items = result.Items,
                        page = result.Page,
                        pageSize = result.PageSize,
                        totalCount = result.TotalCount,
                        totalPages = result.TotalPages
                    }
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "An error occurred while retrieving audit logs: " + ex.Message
                });
            }
        }

        // =========================================================================
        // =========================================================================
        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetAuditLogById(long id)
        {
            var (allowed, forbiddenResult) = await ValidateOrganizationAdminAccessAsync();
            if (!allowed)
            {
                return forbiddenResult!;
            }

            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid audit log ID."
                });
            }

            try
            {
                var auditLog = await _auditLogService.GetAuditLogByIdAsync(User, id);

                if (auditLog == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Audit log not found or does not belong to your organization."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Audit log retrieved successfully",
                    data = auditLog
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "An error occurred while retrieving audit log details: " + ex.Message
                });
            }
        }

        // =========================================================================
        // =========================================================================
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var (allowed, forbiddenResult) = await ValidateOrganizationAdminAccessAsync();
            if (!allowed)
            {
                return forbiddenResult!;
            }

            try
            {
                var summary = await _auditLogService.GetAuditSummaryAsync(User);

                return Ok(new
                {
                    success = true,
                    message = "Audit log summary retrieved successfully",
                    data = summary
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "An error occurred while generating audit summary: " + ex.Message
                });
            }
        }

        // =========================================================================
        // =========================================================================
        [HttpGet("export")]
        public async Task<IActionResult> Export([FromQuery] AuditLogQueryParameters queryParams)
        {
            var (allowed, forbiddenResult) = await ValidateOrganizationAdminAccessAsync();
            if (!allowed)
            {
                return forbiddenResult!;
            }

            try
            {
                var csvBytes = await _auditLogService.ExportAuditLogsCsvAsync(User, queryParams);
                string fileName = $"AuditLogs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";

                return File(csvBytes, "text/csv", fileName);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = "An error occurred while exporting audit logs: " + ex.Message
                });
            }
        }
    }
}
