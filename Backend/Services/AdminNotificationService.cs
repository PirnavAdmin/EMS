using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class AdminNotificationService : IAdminNotificationService

    {

        private readonly AppDbContext _context;

        public AdminNotificationService(AppDbContext context)

        {

            _context = context;

        }

        //---------------------------------------

        // GET ONLY UNREAD NOTIFICATIONS

        //---------------------------------------

        public async Task<List<AdminNotificationDto>> GetNotifications()

        {

            return await _context.AdminNotifications

                .AsNoTracking()

                .Where(x => x.IsRead == false)

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

        }

        //---------------------------------------

        // GET UNREAD COUNT

        //---------------------------------------

        public async Task<int> GetUnreadCount()

        {

            return await _context.AdminNotifications

                .AsNoTracking()

                .Where(x => x.IsRead == false)

                .CountAsync();

        }

        //---------------------------------------

        // MARK AS READ

        //---------------------------------------

        public async Task<bool> MarkAsRead(int id)

        {

            var notification = await _context.AdminNotifications

                .FirstOrDefaultAsync(x => x.Id == id);

            if (notification == null)

            {

                Console.WriteLine($"❌ Notification not found: {id}");

                return false;

            }

            if (notification.IsRead)

            {

                Console.WriteLine($"⚠️ Already read: {id}");

                return false;

            }

            notification.IsRead = true;

            _context.AdminNotifications.Update(notification);

            var rows = await _context.SaveChangesAsync();

            Console.WriteLine($"✅ Rows affected: {rows}");

            Console.WriteLine($"✅ Marked as read in DB: {id}");

            return rows > 0;

        }

        //---------------------------------------

        // MARK ALL AS READ

        //---------------------------------------

        public async Task MarkAllAsRead()

        {

            var unreadNotifications = await _context.AdminNotifications

                .Where(x => x.IsRead == false)

                .ToListAsync();

            foreach (var notification in unreadNotifications)

            {

                notification.IsRead = true;

            }

            await _context.SaveChangesAsync();

        }

        //---------------------------------------

        // CREATE NOTIFICATION

        //---------------------------------------

        public async Task CreateNotification(string title, string message)

        {

            var notification = new AdminNotification

            {

                Title = title,

                Message = message,

                UserRole = "Admin",

                IsRead = false,

                CreatedAt = DateTime.UtcNow

            };

            await _context.AdminNotifications.AddAsync(notification);

            await _context.SaveChangesAsync();

        }

    }

}
