using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/user-notifications")]

    [ApiController]

    [Authorize]

    public class UserNotificationController : ControllerBase

    {

        private readonly IUserNotificationService _userNotificationService;

        public UserNotificationController(IUserNotificationService userNotificationService)

        {

            _userNotificationService = userNotificationService;

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
