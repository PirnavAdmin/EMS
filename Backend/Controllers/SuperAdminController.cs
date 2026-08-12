using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SuperAdminController : ControllerBase
    {
        private readonly ISuperAdminService _superAdminService;

        public SuperAdminController(
            ISuperAdminService superAdminService)
        {
            _superAdminService = superAdminService;
        }

        // ============================================
        // SUPER ADMIN LOGIN
        // ============================================

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] SuperAdminLoginDto dto)
        {
            var result =
                await _superAdminService.Login(dto);

            dynamic response = result;

            if (response.Success == false)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }


        // ============================================
        // SUPER ADMIN DASHBOARD
        // ============================================

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var result =
                    await _superAdminService.GetDashboard();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = ex.Message
                });
            }
        }
    }
}