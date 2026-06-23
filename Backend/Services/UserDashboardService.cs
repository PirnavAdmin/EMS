using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class UserDashboardService : IUserDashboardService
    {
        private readonly AppDbContext _context;

        public UserDashboardService(AppDbContext context)
        {
            _context = context;
        }

        //---------------------------------------
        // USER DASHBOARD
        //---------------------------------------

        public async Task<UserDashboardResponseDto> GetUserDashboard(ClaimsPrincipal user)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrEmpty(email))
                return null;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == email);

            if (employee == null)
                return null;

            var employeeId = employee.Employee_Id;

            //---------------------------------------
            // TASKS
            //---------------------------------------

            var myTasks = await _context.TaskManagement
                .Where(t => t.AssignedTo == employeeId)
                .CountAsync();

            var completedTasks = await _context.TaskManagement
                .Where(t => t.AssignedTo == employeeId && t.Status == "Completed")
                .CountAsync();

            var pendingTasks = await _context.TaskManagement
                .Where(t => t.AssignedTo == employeeId && t.Status != "Completed")
                .CountAsync();

            //---------------------------------------
            // ATTENDANCE %
            //---------------------------------------

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            var istNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, istZone);

            var currentMonth = istNow.Month;
            var currentYear = istNow.Year;

            var presentDays = await _context.Attendance
                .Where(a => a.Employee_Id == employeeId
                    && a.Status == "Present"
                    && a.Attendance_Date.Month == currentMonth
                    && a.Attendance_Date.Year == currentYear)
                .CountAsync();

            var totalDays = DateTime.DaysInMonth(currentYear, currentMonth);

            double attendancePercentage = 0;

            if (totalDays > 0)
            {
                attendancePercentage = ((double)presentDays / totalDays) * 100;
            }

            //---------------------------------------
            // RECENT ACTIVITIES
            //---------------------------------------

            var activityExpiry = DateTime.UtcNow.AddHours(-2);

            var activityData = await _context.UserNotifications
                .Where(n => n.Employee_Id == employeeId
                    && n.CreatedAt >= activityExpiry)
                .OrderByDescending(n => n.CreatedAt)
                .Take(5)
                .ToListAsync();

            var activities = activityData.Select(n => new RecentActivityDto
            {
                Activity = n.Message,
                Time = GetTimeAgo(n.CreatedAt)
            }).ToList();
           
            //---------------------------------------
            // UPCOMING HOLIDAYS
            //---------------------------------------

            var todayIst = istNow.Date;

            var holidayData = await _context.Holidays
                .Where(h => h.Holiday_Date >= todayIst)
                .OrderBy(h => h.Holiday_Date)
                .Take(3)
                .ToListAsync();

            var holidays = holidayData.Select(h => new UpComingHolidayDto
            {
                HolidayName = h.Holiday_Name,
                Date = h.Holiday_Date
            }).ToList();

            //---------------------------------------
            // RETURN DTO
            //---------------------------------------

            return new UserDashboardResponseDto
            {
                MyTasks = myTasks,
                CompletedTasks = completedTasks,
                PendingTasks = pendingTasks,
                Attendance = Math.Round(attendancePercentage, 2),
                RecentActivities = activities,
                UpcomingHolidays = holidays
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