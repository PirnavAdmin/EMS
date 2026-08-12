using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin")]
    public class AdminSubscriptionController : ControllerBase
    {
        private readonly IAdminSubscriptionService _service;

        public AdminSubscriptionController(
            IAdminSubscriptionService service)
        {
            _service = service;
        }


        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(
            AdminSubscriptionDto dto)
        {
            try
            {
                var result =
                    await _service.CreateSubscription(dto);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }


        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result =
                await _service.GetAllSubscriptions();

            return Ok(result);
        }


        // GET BY ADMIN
        [HttpGet("{adminId}")]
        public async Task<IActionResult> Get(int adminId)
        {
            try
            {
                var result =
                    await _service.GetSubscription(adminId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }


        // UPDATE / RENEW
        [HttpPut("{adminId}")]
        public async Task<IActionResult> Update(
            int adminId,
            AdminSubscriptionDto dto)
        {
            try
            {
                var result =
                    await _service.UpdateSubscription(
                        adminId,
                        dto);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }


        // USAGE
        [HttpGet("{adminId}/usage")]
        public async Task<IActionResult> Usage(int adminId)
        {
            try
            {
                var result =
                    await _service.GetUsage(adminId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }
    }
}