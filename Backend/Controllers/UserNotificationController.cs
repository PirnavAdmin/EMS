using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;
using EmployeeManagementSystem.Services;
using System.Security.Claims;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/user-notifications")]

    [ApiController]

    [Authorize]

    public class UserNotificationController : ControllerBase

    {

        private readonly IUserNotificationService _userNotificationService;
        private readonly AppDbContext _context;
       // private readonly IFcmNotificationService _fcmNotificationService;

        public UserNotificationController(
      IUserNotificationService userNotificationService,
      AppDbContext context
      //IFcmNotificationService fcmNotificationService
      )
        {
            _userNotificationService = userNotificationService;
            _context = context;
            //_fcmNotificationService = fcmNotificationService;
        }
        //---------------------------------------

        // GET CURRENT USER NOTIFICATIONS

        //---------------------------------------

        [HttpGet]

        public async Task<IActionResult> GetMyNotifications()

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 GET /api/user-notifications called");

                Console.WriteLine("=====================================");

                var employeeId = User.FindFirst("EmployeeId")?.Value

                                 ?? User.FindFirst("Employee_Id")?.Value

                                 ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                var email = User.FindFirst(ClaimTypes.Email)?.Value;

                Console.WriteLine($"🆔 EmployeeId from token: {employeeId}");

                Console.WriteLine($"📧 Email from token: {email}");

                if (!string.IsNullOrEmpty(employeeId))

                {

                    var notifications = await _userNotificationService.GetNotifications(employeeId);

                    Console.WriteLine($"📦 Notifications returned: {notifications.Count}");

                    return Ok(notifications);

                }

                if (!string.IsNullOrEmpty(email))

                {

                    return await _userNotificationService.GetNotificationsByEmail(email);

                }

                Console.WriteLine("❌ EmployeeId / Email not found in token");

                return Unauthorized("Employee information not found in token");

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in GetMyNotifications:");

                Console.WriteLine(ex.ToString());

                return BadRequest(ex.Message);

            }

        }

        //---------------------------------------

        // MARK SINGLE AS READ

        //---------------------------------------

    //    [HttpPost("devices")]
    //    public async Task<IActionResult> RegisterDevice(
    //[FromBody] RegisterNotificationDeviceDto dto)
    //    {
    //        if (!ModelState.IsValid)
    //            return BadRequest(ModelState);

    //        if (string.IsNullOrWhiteSpace(dto.InstallationId) ||
    //            string.IsNullOrWhiteSpace(dto.DeviceToken))
    //        {
    //            return BadRequest(new
    //            {
    //                message = "InstallationId and DeviceToken are required."
    //            });
    //        }

    //        var employeeId =
    //            User.FindFirst("EmployeeId")?.Value ??
    //            User.FindFirst("Employee_Id")?.Value ??
    //            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    //        if (string.IsNullOrWhiteSpace(employeeId))
    //        {
    //            return Unauthorized(new
    //            {
    //                message = "Employee ID not found in token."
    //            });
    //        }

    //        var installationId = dto.InstallationId.Trim();
    //        var deviceToken = dto.DeviceToken.Trim();

    //        var device = await _context.UserNotificationDevices
    //            .FirstOrDefaultAsync(d =>
    //                d.InstallationId == installationId);

    //        if (device == null)
    //        {
    //            device = new UserNotificationDevice
    //            {
    //                EmployeeId = employeeId,
    //                InstallationId = installationId,
    //                Platform = dto.Platform.Trim(),
    //                Provider = "fcm",
    //                DeviceToken = deviceToken,
    //                IsActive = true,
    //                CreatedAt = DateTime.UtcNow,
    //                UpdatedAt = DateTime.UtcNow
    //            };

    //            _context.UserNotificationDevices.Add(device);
    //        }
    //        else
    //        {
    //            // Update the installation if its user or token changes.
    //            device.EmployeeId = employeeId;
    //            device.Platform = dto.Platform.Trim();
    //            device.Provider = "fcm";
    //            device.DeviceToken = deviceToken;
    //            device.IsActive = true;
    //            device.UpdatedAt = DateTime.UtcNow;
    //        }

    //        await _context.SaveChangesAsync();

    //        return Ok(new
    //        {
    //            message = "Device registered successfully."
    //        });
    //    }
    //    [HttpDelete("devices/{installationId}")]
    //    public async Task<IActionResult> UnregisterDevice(string installationId)
    //    {
    //        var employeeId =
    //            User.FindFirst("EmployeeId")?.Value ??
    //            User.FindFirst("Employee_Id")?.Value ??
    //            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    //        if (string.IsNullOrWhiteSpace(employeeId))
    //        {
    //            return Unauthorized(new
    //            {
    //                message = "Employee ID not found in token."
    //            });
    //        }

    //        if (string.IsNullOrWhiteSpace(installationId))
    //        {
    //            return BadRequest(new
    //            {
    //                message = "Installation ID is required."
    //            });
    //        }

    //        var device = await _context.UserNotificationDevices
    //.FirstOrDefaultAsync(d =>
    //    d.InstallationId == installationId &&
    //    d.EmployeeId == employeeId &&
    //    d.IsActive);

    //        if (device == null)
    //        {
    //            return NotFound(new
    //            {
    //                message = "Active device registration not found."
    //            });
    //        }

    //        device.IsActive = false;
    //        device.UpdatedAt = DateTime.UtcNow;

    //        await _context.SaveChangesAsync();

    //        return Ok(new
    //        {
    //            message = "Device unregistered successfully."
    //        });
    //    }
        [HttpPut("{id}/read")]

        public async Task<IActionResult> MarkAsRead(int id)

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine($"📥 PUT /api/user-notifications/{id}/read called");

                Console.WriteLine("=====================================");

                var result = await _userNotificationService.MarkAsRead(id);

                if (!result)

                {

                    Console.WriteLine($"❌ Failed to mark notification {id} as read");

                    return NotFound(new { message = "Notification not found or already read" });

                }

                Console.WriteLine($"✅ Notification {id} marked as read successfully");

                return Ok(new { message = "Notification marked as read successfully" });

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in MarkAsRead controller:");

                Console.WriteLine(ex.ToString());

                return BadRequest(ex.Message);

            }

        }

        //---------------------------------------

        // MARK ALL AS READ

        //---------------------------------------

        //[HttpPost("test-push")]
        //public async Task<IActionResult> TestPush()
        //{
        //    var employeeId =
        //        User.FindFirst("EmployeeId")?.Value ??
        //        User.FindFirst("Employee_Id")?.Value ??
        //        User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        //    if (string.IsNullOrWhiteSpace(employeeId))
        //        return Unauthorized("Employee ID not found in token.");

        //    await _fcmNotificationService.SendToEmployeeAsync(
        //        employeeId: employeeId,
        //        title: "HRMS Test Notification",
        //        body: "Your Firebase push notification is working!",
        //        type: "TEST",
        //        screen: "MyTeam");

        //    return Ok(new
        //    {
        //        message = "Push notification request completed.",
        //        employeeId
        //    });
        //}
        [HttpPut("mark-all")]

        public async Task<IActionResult> MarkAllAsRead()

        {

            try

            {

                Console.WriteLine("=====================================");

                Console.WriteLine("📥 PUT /api/user-notifications/mark-all called");

                Console.WriteLine("=====================================");

                var employeeId = User.FindFirst("EmployeeId")?.Value

                                 ?? User.FindFirst("Employee_Id")?.Value

                                 ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                Console.WriteLine($"🆔 EmployeeId from token: {employeeId}");

                if (string.IsNullOrEmpty(employeeId))

                {

                    Console.WriteLine("❌ Employee ID not found in token");

                    return Unauthorized("Employee ID not found in token");

                }

                await _userNotificationService.MarkAllAsRead(employeeId);

                Console.WriteLine("✅ All notifications marked as read");

                return Ok(new { message = "All notifications marked as read successfully" });

            }

            catch (Exception ex)

            {

                Console.WriteLine("❌ ERROR in MarkAllAsRead controller:");

                Console.WriteLine(ex.ToString());

                return BadRequest(ex.Message);

            }

        }

    }

}
