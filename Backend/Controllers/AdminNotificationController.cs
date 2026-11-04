using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
            return await _service.GetNotifications(User);
        }

        //---------------------------------------
        // GET UNREAD COUNT
        //---------------------------------------

        [HttpGet("count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            return await _service.GetUnreadCount(User);
        }

        //---------------------------------------
        // MARK AS READ
        //---------------------------------------

        [HttpPut("read/{id}")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            return await _service.MarkAsRead(User, id);
        }

        //---------------------------------------
        // MARK ALL AS READ
        //---------------------------------------

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            return await _service.MarkAllAsRead(User);
        }
    }
}