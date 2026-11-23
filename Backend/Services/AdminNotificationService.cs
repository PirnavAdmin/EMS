using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class AdminNotificationService : IAdminNotificationService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AdminNotificationService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private async Task<int?> GetTenantOrgIdAsync(ClaimsPrincipal? user = null)
        {
            var principal = user ?? _httpContextAccessor.HttpContext?.User;
            if (principal == null) return null;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, principal);
            return orgId;
        }

        //-------------------------------------------------
        // ADMIN VALIDATION
        //-------------------------------------------------
        private static DateTime GetIndianTime()

        {

            TimeZoneInfo indiaTimeZone = TimeZoneInfo.FindSystemTimeZoneById(

                OperatingSystem.IsWindows()

                    ? "India Standard Time"

                    : "Asia/Kolkata"

            );

            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, indiaTimeZone);

        }

        private async Task<bool> IsAdmin(ClaimsPrincipal user)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrWhiteSpace(email))
                return false;

            return await _context.Admins
                .AsNoTracking()
                .AnyAsync(x => x.Email.ToLower() == email.ToLower());
        }

        //-------------------------------------------------
        // GET NOTIFICATIONS
        //-------------------------------------------------

        public async Task<IActionResult> GetNotifications(ClaimsPrincipal user)
        {
            if (!await IsAdmin(user))
                return new UnauthorizedObjectResult("Only Admins can access notifications.");

            var orgId = await GetTenantOrgIdAsync(user);
            var query = _context.AdminNotifications
                .AsNoTracking()
                .Where(x => !x.IsRead);

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }
            var indiaTimeZone = TimeZoneInfo.FindSystemTimeZoneById(

     OperatingSystem.IsWindows()

         ? "India Standard Time"

         : "Asia/Kolkata"

);

            var notifications = await query
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var result = notifications.Select(n =>

            {

                // Database DATETIME values are treated as UTC

                var utcDate = DateTime.SpecifyKind(

                    n.CreatedAt,

                    DateTimeKind.Utc

                );

                var istDate = TimeZoneInfo.ConvertTime(

                    utcDate,

                    indiaTimeZone

                );

                return new AdminNotificationDto

                {

                    Id = n.Id,

                    Title = n.Title,

                    Message = n.Message,

                    IsRead = n.IsRead,

                    CreatedAt = istDate

                };

            }).ToList();


            return new OkObjectResult(notifications);
        }

        //-------------------------------------------------
        // UNREAD COUNT
        //-------------------------------------------------

        public async Task<IActionResult> GetUnreadCount(ClaimsPrincipal user)
        {
            if (!await IsAdmin(user))
                return new UnauthorizedObjectResult("Only Admins can access notifications.");

            var orgId = await GetTenantOrgIdAsync(user);
            var query = _context.AdminNotifications
                .AsNoTracking()
                .Where(x => !x.IsRead);

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var count = await _context.AdminNotifications

     .AsNoTracking()

     .CountAsync(x => !x.IsRead);


            return new OkObjectResult(count);
        }

        //-------------------------------------------------
        // MARK AS READ
        //-------------------------------------------------

        public async Task<IActionResult> MarkAsRead(ClaimsPrincipal user, int id)
        {
            if (!await IsAdmin(user))
                return new UnauthorizedObjectResult("Only Admins can access notifications.");

            var orgId = await GetTenantOrgIdAsync(user);
            var query = _context.AdminNotifications.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var notification = await query.FirstOrDefaultAsync(x => x.Id == id);

            if (notification == null)
                return new NotFoundObjectResult("Notification not found.");

            if (notification.IsRead)
                return new OkObjectResult("Already marked as read.");

            notification.IsRead = true;

            await _context.SaveChangesAsync();

            return new OkObjectResult("Notification marked as read.");
        }

        //-------------------------------------------------
        // MARK ALL AS READ
        //-------------------------------------------------

        public async Task<IActionResult> MarkAllAsRead(ClaimsPrincipal user)
        {
            if (!await IsAdmin(user))
                return new UnauthorizedObjectResult("Only Admins can access notifications.");

            var orgId = await GetTenantOrgIdAsync(user);
            var query = _context.AdminNotifications.Where(x => !x.IsRead);

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var notifications = await query.ToListAsync();

            foreach (var item in notifications)
            {
                item.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult("All notifications marked as read.");
        }

        //-------------------------------------------------
        // CREATE NOTIFICATION
        //-------------------------------------------------

        public async Task CreateNotification(string title, string message, int? organizationId = null)
        {
            var orgId = organizationId ?? await GetTenantOrgIdAsync();

            var notification = new AdminNotification
            {
                Title = title,
                Message = message,
                OrganizationId = orgId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            await _context.AdminNotifications.AddAsync(notification);

            await _context.SaveChangesAsync();
        }
    }
}