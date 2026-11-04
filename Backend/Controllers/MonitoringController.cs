using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
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
            var settings = await _context.MonitoringSettings
                .FirstOrDefaultAsync();

            if (settings == null)
            {
                return NotFound(new
                {
                    message = "Monitoring settings not found"
                });
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
            var settings = await _context.MonitoringSettings
                .FirstOrDefaultAsync();

            if (settings == null)
            {
                settings = new MonitoringSettings();

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
            var today = DateTime.Today;

            var totalEmployees =
                await _context.EmployeeScreenshots
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .CountAsync();

            var screenshotsToday =
                await _context.EmployeeScreenshots
                    .Where(x => x.CreatedAt.Date == today)
                    .CountAsync();

            var activeEmployees =
                await _context.EmployeeScreenshots
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
            var employees = await _context.EmployeeScreenshots
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