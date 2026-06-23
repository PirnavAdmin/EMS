using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers

{

    [Authorize]

    [ApiController]

    [Route("api/admin-notifications")]

    public class AdminNotificationController : ControllerBase

    {

        private readonly IAdminNotificationService _service;

        public AdminNotificationController(IAdminNotificationService service)

        {

            _service = service;

        }

        //---------------------------------------

        // GET NOTIFICATIONS

        //---------------------------------------

        [HttpGet]

        public async Task<IActionResult> GetNotifications()

        {

            var email = User.FindFirst(ClaimTypes.Email)?.Value

                        ?? User.FindFirst("email")?.Value;

            if (email != "admin@ems.com")

                return Unauthorized("Only admin can access this");

            var data = await _service.GetNotifications();

            return Ok(data);

        }

        //---------------------------------------

        // GET UNREAD COUNT

        //---------------------------------------

        [HttpGet("count")]

        public async Task<IActionResult> GetUnreadCount()

        {

            var email = User.FindFirst(ClaimTypes.Email)?.Value

                        ?? User.FindFirst("email")?.Value;

            if (email != "admin@ems.com")

                return Unauthorized("Only admin can access this");

            var count = await _service.GetUnreadCount();

            return Ok(new { unreadCount = count });

        }

        //---------------------------------------

        // MARK AS READ

        //---------------------------------------

        [HttpPut("read/{id}")]

        public async Task<IActionResult> MarkAsRead(int id)

        {

            var email = User.FindFirst(ClaimTypes.Email)?.Value

                        ?? User.FindFirst("email")?.Value;

            if (email != "admin@ems.com")

                return Unauthorized("Only admin can access this");

            var updated = await _service.MarkAsRead(id);

            if (!updated)

                return NotFound(new { message = "Notification not found or already read" });

            return Ok(new { message = "Notification marked as read" });

        }

        //---------------------------------------

        // MARK ALL AS READ

        //---------------------------------------

        [HttpPut("read-all")]

        public async Task<IActionResult> MarkAllAsRead()

        {

            var email = User.FindFirst(ClaimTypes.Email)?.Value

                        ?? User.FindFirst("email")?.Value;

            if (email != "admin@ems.com")

                return Unauthorized("Only admin can access this");

            await _service.MarkAllAsRead();

            return Ok(new { message = "All notifications marked as read" });

        }

    }

}
