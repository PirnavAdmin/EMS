using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DashboardService(
            AppDbContext context,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<DashboardResponseDto> GetDashboardData()
        {
            var user = _httpContextAccessor.HttpContext?.User;

            var adminIdClaim = user?.FindFirst("AdminId")?.Value;

            int adminId;

            if (!string.IsNullOrWhiteSpace(adminIdClaim) &&
                int.TryParse(adminIdClaim, out adminId))
            {
                // AdminId found directly in JWT
            }
            else
            {
                var employeeId = user?.FindFirst("EmployeeId")?.Value;

                if (string.IsNullOrWhiteSpace(employeeId))
                {
                    throw new UnauthorizedAccessException(
                        "AdminId/EmployeeId missing in token.");
                }

                var loggedInEmployee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

                if (loggedInEmployee?.AdminId == null)
                {
                    throw new UnauthorizedAccessException(
                        "Logged-in user is not assigned to an Admin/company.");
                }

                adminId = loggedInEmployee.AdminId.Value;
            }

            var utcNow = DateTime.UtcNow;
            var today = utcNow.Date;

            // ==========================================
            // TOTAL EMPLOYEES - CURRENT ADMIN ONLY
            // ==========================================
            var totalEmployees = await _context.Employees
                .Where(e => e.AdminId == adminId)
                .CountAsync();

            // ==========================================
            // TOTAL DEPARTMENTS
            // ==========================================
            var totalDepartments = await _context.Departments
                .CountAsync();

            // ==========================================
            // ACTIVE PROJECTS
            // ==========================================
            var activeProjects = await _context.Projects
      .Where(p => new[] { "Active", "In Progress" }.Contains(p.Status))
      .CountAsync();

            // ==========================================
            // TODAY ATTENDANCE - CURRENT ADMIN EMPLOYEES
            // ==========================================
            var totalAttendance = await _context.Attendance
                .Where(a =>
                    a.Attendance_Date == today &&
                    _context.Employees.Any(e =>
                        e.Employee_Id == a.Employee_Id &&
                        e.AdminId == adminId))
                .CountAsync();

            double attendancePercentage = totalEmployees > 0
                ? (double)totalAttendance / totalEmployees * 100
                : 0;

            // ==========================================
            // RECENT ACTIVITIES
            // ==========================================
            var activityExpiry = utcNow.AddHours(-2);

            var activityLogs = await _context.ActivityLogs
                .Where(a => a.CreatedAt >= activityExpiry)
                .OrderByDescending(a => a.CreatedAt)
                .Take(15)
                .Select(a => new
                {
                    a.Activity,
                    a.CreatedAt
                })
                .ToListAsync();

            var recentActivities = activityLogs
                .Select(a => new RecentActivityDto
                {
                    Activity = a.Activity,
                    Time = GetTimeAgo(a.CreatedAt)
                })
                .ToList();

            // ==========================================
            // UPCOMING HOLIDAYS
            // ==========================================
            var upcomingHolidays = await _context.Holidays
                .Where(h => h.Holiday_Date >= today)
                .OrderBy(h => h.Holiday_Date)
                .Take(3)
                .Select(h => new UpComingHolidayDto
                {
                    HolidayName = h.Holiday_Name,
                    Date = h.Holiday_Date
                })
                .ToListAsync();

            return new DashboardResponseDto
            {
                TotalEmployees = totalEmployees,
                TotalDepartments = totalDepartments,
                ActiveProjects = activeProjects,
                AttendancePercentage = Math.Round(attendancePercentage, 2),
                RecentActivities = recentActivities,
                UpcomingHolidays = upcomingHolidays
            };
        }

        private static string GetTimeAgo(DateTime createdAt)
        {
            if (createdAt.Kind == DateTimeKind.Unspecified)
                createdAt = DateTime.SpecifyKind(
                    createdAt,
                    DateTimeKind.Utc);

            var timeSpan = DateTime.UtcNow - createdAt;

            if (timeSpan.TotalSeconds < 0)
                return "just now";

            if (timeSpan.TotalSeconds < 60)
                return "just now";

            if (timeSpan.TotalMinutes < 60)
                return $"{(int)timeSpan.TotalMinutes} minutes ago";

            if (timeSpan.TotalHours < 24)
                return $"{(int)timeSpan.TotalHours} hours ago";

            return createdAt.ToString("dd MMM yyyy");
        }
    }
}