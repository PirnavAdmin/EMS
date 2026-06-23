using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolePermissionController : ControllerBase
    {
        private readonly IRolePermissionService _service;

        public RolePermissionController(IRolePermissionService service)
        {
            _service = service;
        }

        // 🔹 GET ALL PERMISSIONS (for UI screen)
        [HttpGet("{roleName}")]
        public async Task<IActionResult> Get(string roleName)
        {
            var result = await _service.GetPermissions(roleName);
            return Ok(result);
        }

        // 🔹 SAVE PERMISSIONS
        [HttpPost("save")]
        public async Task<IActionResult> Save(SaveRolePermissionDto dto)
        {
            await _service.SavePermissions(dto);
            return Ok("Permissions saved");
        }

        // 🔥 GET ALLOWED MODULES (for logged-in user)
        [HttpGet("allowed-modules")]
        [Authorize]
        public async Task<IActionResult> GetAllowedModules()
        {
            try
            {
                // ✅ READ ROLEID FROM JWT (STANDARD WAY)
                var roleIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(roleIdClaim))
                    return BadRequest("RoleId missing in token");

                if (!int.TryParse(roleIdClaim, out int roleId))
                    return BadRequest("Invalid RoleId");

                // ✅ CALL SERVICE (NO _context HERE)
                var modules = await _service.GetAllowedModules(roleId);

                return Ok(modules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}