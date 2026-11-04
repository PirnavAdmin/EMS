using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class AdminNotificationService : IAdminNotificationService
    {
        private readonly AppDbContext _context;

        public AdminNotificationService(AppDbContext context)
        {
            _context = context;
        }

        //-------------------------------------------------
        // ADMIN VALIDATION
        //-------------------------------------------------

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

            var notifications = await _context.AdminNotifications
                .AsNoTracking()
                .Where(x => !x.IsRead)
                .OrderByDescending(x => x.CreatedAt)
                .Take(10)
                .Select(n => new AdminNotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return new OkObjectResult(notifications);
        }

        //-------------------------------------------------
        // UNREAD COUNT
        //-------------------------------------------------

        public async Task<IActionResult> GetUnreadCount(ClaimsPrincipal user)
        {
            if (!await IsAdmin(user))
                return new UnauthorizedObjectResult("Only Admins can access notifications.");

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

            var notification = await _context.AdminNotifications
                .FirstOrDefaultAsync(x => x.Id == id);

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

            var notifications = await _context.AdminNotifications
                .Where(x => !x.IsRead)
                .ToListAsync();

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

        public async Task CreateNotification(string title, string message)
        {
            var notification = new AdminNotification
            {
                Title = title,
                Message = message,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            await _context.AdminNotifications.AddAsync(notification);

            await _context.SaveChangesAsync();
        }
    }
}