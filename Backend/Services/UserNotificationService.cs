using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class UserNotificationService : IUserNotificationService

    {

        private readonly AppDbContext _context;

        public UserNotificationService(AppDbContext context)

        {

            _context = context;

        }

        //---------------------------------------

        // GET BY EMAIL (SHOW ALL: READ + UNREAD)

        //---------------------------------------

        public async Task<IActionResult> GetNotificationsByEmail(string email)

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 GetNotificationsByEmail called");

                Console.WriteLine($"📧 Email received: {email}");

                Console.WriteLine("=====================================");

                if (string.IsNullOrEmpty(email))

                    return new BadRequestObjectResult("Email is required");

                var employee = await _context.Employees

                    .AsNoTracking()

                    .FirstOrDefaultAsync(x => x.Email == email);

                if (employee == null)

                    return new NotFoundObjectResult("Employee not found");

                var notifications = await _context.UserNotifications

                    .AsNoTracking()

                    .Where(n => n.Employee_Id == employee.Employee_Id) // ✅ removed unread filter

                    .OrderByDescending(n => n.CreatedAt)

                    .ToListAsync();

                notifications.ForEach(n =>
                {
                    n.CreatedAt = EnsureUtc(n.CreatedAt);
                });

                Console.WriteLine($"📦 Notifications fetched: {notifications.Count}");

                return new OkObjectResult(notifications);

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in GetNotificationsByEmail:");

                Console.WriteLine(ex.ToString());

                return new BadRequestObjectResult(ex.Message);

            }

        }

        //---------------------------------------

        // GET BY EMPLOYEE ID (SHOW ALL: READ + UNREAD)

        //---------------------------------------

        public async Task<List<UserNotification>> GetNotifications(string employeeId)

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 GetNotifications called");

                Console.WriteLine($"🆔 Employee ID: {employeeId}");

                Console.WriteLine("=====================================");

                var notifications = await _context.UserNotifications

                    .AsNoTracking()

                    .Where(n => n.Employee_Id == employeeId) // ✅ removed unread filter

                    .OrderByDescending(n => n.CreatedAt)

                    .ToListAsync();

                foreach (var item in notifications)

                {

                    item.CreatedAt = EnsureUtc(item.CreatedAt);

                }

                Console.WriteLine($"📦 Notifications fetched: {notifications.Count}");

                return notifications;

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in GetNotifications:");

                Console.WriteLine(ex.ToString());

                return new List<UserNotification>();

            }

        }

        //---------------------------------------

        // CREATE

        //---------------------------------------

        public async Task CreateNotification(UserNotificationDto dto)

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 CreateNotification called");

                Console.WriteLine($"👤 Employee_Id: {dto.Employee_Id}");

                Console.WriteLine($"📝 Title: {dto.Title}");

                Console.WriteLine($"💬 Message: {dto.Message}");

                Console.WriteLine("=====================================");

                var notification = new UserNotification

                {

                    Employee_Id = dto.Employee_Id,

                    Title = dto.Title,

                    Message = dto.Message,

                    CreatedAt = DateTime.UtcNow,

                    IsRead = false

                };

                await _context.UserNotifications.AddAsync(notification);

                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ Notification created successfully. ID: {notification.Id}");

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in CreateNotification:");

                Console.WriteLine(ex.ToString());

                throw;

            }

        }

        //---------------------------------------

        // MARK AS READ

        //---------------------------------------

        public async Task<bool> MarkAsRead(int id)
        {
            try
            {
                var notification = await _context.UserNotifications
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (notification == null)
                    return false;

                if (notification.IsRead)
                    return true;

                notification.IsRead = true;

                var rows = await _context.SaveChangesAsync();

                return rows > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ ERROR in MarkAsRead:");
                Console.WriteLine(ex.ToString());
                return false;
            }
        }
        //---------------------------------------

        // MARK ALL AS READ

        //---------------------------------------

        public async Task MarkAllAsRead(string employeeId)

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 MarkAllAsRead called");

                Console.WriteLine($"🆔 Employee ID: {employeeId}");

                Console.WriteLine("=====================================");

                var unread = await _context.UserNotifications

                    .Where(x => x.Employee_Id == employeeId && x.IsRead == false)

                    .ToListAsync();

                Console.WriteLine($"📦 Unread notifications found: {unread.Count}");

                foreach (var item in unread)

                {

                    //item.CreatedAt = EnsureUtc(item.CreatedAt);

                    item.IsRead = true;

                    Console.WriteLine($"✅ Marking notification ID {item.Id} as read");

                }

                var rows = await _context.SaveChangesAsync();

                Console.WriteLine($"✅ MarkAllAsRead completed. Rows affected: {rows}");

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in MarkAllAsRead:");

                Console.WriteLine(ex.ToString());

                throw;

            }

        }

        //---------------------------------------

        // UTC FIX HELPER

        //---------------------------------------

        private DateTime EnsureUtc(DateTime dateTime)

        {

            return dateTime.Kind switch

            {

                DateTimeKind.Utc => dateTime,

                DateTimeKind.Local => dateTime.ToUniversalTime(),

                DateTimeKind.Unspecified => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc),

                _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)

            };

        }

    }

}
