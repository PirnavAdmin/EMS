using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardResponseDto> GetDashboardData()
        {
            var utcNow = DateTime.UtcNow;
            var today = utcNow.Date;

            var totalEmployees = await _context.Employees.CountAsync();
            var totalDepartments = await _context.Departments.CountAsync();

            var activeProjects = await _context.Projects
                .Where(p => p.Status == "Active")
                .CountAsync();

            var totalAttendance = await _context.Attendance
                .Where(a => a.Attendance_Date == today)
                .CountAsync();

            double attendancePercentage = totalEmployees > 0
                ? (double)totalAttendance / totalEmployees * 100
                : 0;

            var activityExpiry = utcNow.AddHours(-2);

            var activityLogs = await _context.ActivityLogs
                .Where(a => a.CreatedAt >= activityExpiry)
                .OrderByDescending(a => a.CreatedAt)
                .Take(5)
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
                createdAt = DateTime.SpecifyKind(createdAt, DateTimeKind.Utc);

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