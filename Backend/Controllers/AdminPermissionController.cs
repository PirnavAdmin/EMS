using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminPermissionController : ControllerBase
    {
        private readonly IAdminPermissionService _service;

        public AdminPermissionController(IAdminPermissionService service)
        {
            _service = service;
        }

        [HttpPost("save")]
        public async Task<IActionResult> SavePermissions(SaveAdminPermissionDto dto)
        {
            var result = await _service.SavePermissions(dto);
            return Ok(result);
        }

        [Authorize]
        [HttpGet("allowed-modules")]
        public async Task<IActionResult> GetAllowedModules()
        {
            try
            {
                // Get AdminId from JWT
                var adminIdClaim = User.FindFirst("AdminId")?.Value;

                if (string.IsNullOrWhiteSpace(adminIdClaim))
                {
                    return Unauthorized(new
                    {
                        Message = "AdminId claim not found in token."
                    });
                }

                if (!int.TryParse(adminIdClaim, out int adminId))
                {
                    return Unauthorized(new
                    {
                        Message = "Invalid AdminId in token."
                    });
                }

                var result = await _service
                    .GetAllowedModules(adminId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Message = ex.Message
                });
            }
        }
        [HttpGet("{adminId}")]
        public async Task<IActionResult> GetPermissions(int adminId)
        {
            var result = await _service.GetPermissions(adminId);
            return Ok(result);
        }
    }
}