using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MonitoringController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MonitoringController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // GET MONITORING SETTINGS
        // =========================================

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (!orgId.HasValue || orgId.Value <= 0)
                return BadRequest("Organization context is required.");
            var targetOrgId = orgId.Value;

            var settings = await _context.MonitoringSettings
                .FirstOrDefaultAsync(s => s.OrganizationId == targetOrgId);

            if (settings == null)
            {
                settings = new MonitoringSettings
                {
                    OrganizationId = targetOrgId,
                    ScreenshotInterval = 5,
                    EnableScreenshotMonitoring = true,
                    EnableActiveWindowTracking = true,
                    EnableIdleDetection = true,
                    EnableAutoUpload = true,
                    EnableBackgroundMonitoring = true,
                    UpdatedAt = DateTime.Now
                };

                _context.MonitoringSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(settings);
        }

        // =========================================
        // SAVE MONITORING SETTINGS
        // =========================================

        [HttpPut("settings")]
        public async Task<IActionResult> SaveSettings(
            [FromBody] MonitoringSettingsDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (!orgId.HasValue || orgId.Value <= 0)
                return BadRequest("Organization context is required.");
            var targetOrgId = orgId.Value;

            var settings = await _context.MonitoringSettings
                .FirstOrDefaultAsync(s => s.OrganizationId == targetOrgId);

            if (settings == null)
            {
                settings = new MonitoringSettings
                {
                    OrganizationId = targetOrgId
                };

                _context.MonitoringSettings.Add(settings);
            }

            settings.ScreenshotInterval =
                dto.ScreenshotInterval;

            settings.EnableScreenshotMonitoring =
                dto.EnableScreenshotMonitoring;

            settings.EnableActiveWindowTracking =
                dto.EnableActiveWindowTracking;

            settings.EnableIdleDetection =
                dto.EnableIdleDetection;

            settings.EnableAutoUpload =
                dto.EnableAutoUpload;

            settings.EnableBackgroundMonitoring =
                dto.EnableBackgroundMonitoring;

            settings.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Monitoring settings updated successfully"
            });
        }

        // =========================================
        // DASHBOARD SUMMARY
        // =========================================

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var today = DateTime.Today;

            var query = _context.EmployeeScreenshots.AsQueryable();
            if (orgId.HasValue)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var totalEmployees =
                await query
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .CountAsync();

            var screenshotsToday =
                await query
                    .Where(x => x.CreatedAt.Date == today)
                    .CountAsync();

            var activeEmployees =
                await query
                    .Where(x =>
                        x.CreatedAt >= DateTime.Now.AddMinutes(-30))
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .CountAsync();

            var inactiveEmployees =
                totalEmployees - activeEmployees;

            return Ok(new
            {
                totalMonitored = totalEmployees,

                activeEmployees,

                inactiveEmployees,

                screenshotsToday
            });
        }

        // =========================================
        // EMPLOYEE MONITORING LIST
        // =========================================

        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.EmployeeScreenshots.AsQueryable();
            if (orgId.HasValue)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var employees = await query
                .GroupBy(x => x.EmployeeId)
                .Select(g => new
                {
                    employeeId = g.Key,

                    deviceName =
                        g.OrderByDescending(x => x.CreatedAt)
                         .Select(x => x.DeviceName)
                         .FirstOrDefault(),

                    lastScreenshotTime =
                        g.Max(x => x.CreatedAt),

                    screenshotCount =
                        g.Count(),

                    status =
                        g.Max(x => x.CreatedAt)
                        >= DateTime.Now.AddMinutes(-30)
                            ? "Active"
                            : "Inactive"
                })
                .OrderByDescending(x => x.lastScreenshotTime)
                .ToListAsync();

            return Ok(employees);
        }
    }
}