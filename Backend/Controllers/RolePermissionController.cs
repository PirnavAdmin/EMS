using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
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
        //[Permission(ModuleIds.ScreenPermissions, PermissionAction.View)]
        
        [HttpGet("{roleName}")]
        public async Task<IActionResult> Get(string roleName)
        {
            var adminIdClaim = User.FindFirst("AdminId")?.Value;

            if (string.IsNullOrEmpty(adminIdClaim))
                return Unauthorized("AdminId missing in token.");

            int adminId = int.Parse(adminIdClaim);

            var result = await _service.GetPermissions(adminId, roleName);

            return Ok(result);
        }

        // 🔹 SAVE PERMISSIONS
        //[Permission(ModuleIds.ScreenPermissions, PermissionAction.Edit)]
        
        [HttpPost("save")]
        public async Task<IActionResult> Save(SaveRolePermissionDto dto)
        {
            var adminIdClaim = User.FindFirst("AdminId")?.Value;

            if (string.IsNullOrEmpty(adminIdClaim))
                return Unauthorized("AdminId missing in token.");

            int adminId = int.Parse(adminIdClaim);

            await _service.SavePermissions(adminId, dto);

            return Ok("Permissions saved successfully.");
        }

        //[Permission(ModuleIds.ScreenPermissions, PermissionAction.View)]
        [HttpGet("employees/{roleName}")]
        public async Task<IActionResult> GetEmployeesByRole(string roleName)
        {
            var result = await _service.GetEmployeesByRole(roleName);
            return Ok(result);
        }

        // 🔥 GET ALLOWED MODULES (for logged-in user)
        //[Permission(ModuleIds.ScreenPermissions, PermissionAction.View)]
       
        [HttpGet("allowed-modules")]
        public async Task<IActionResult> GetAllowedModules()
        {
            // Get AdminId from JWT
            var adminIdClaim =
                User.FindFirst("AdminId")?.Value;

            if (!int.TryParse(
                adminIdClaim,
                out int adminId))
            {
                return Unauthorized(new
                {
                    Success = false,
                    Message = "AdminId not found in token."
                });
            }


            // Get RoleId from JWT
            var roleIdClaim =
                User.FindFirst("RoleId")?.Value;

            if (!int.TryParse(
                roleIdClaim,
                out int roleId))
            {
                return Unauthorized(new
                {
                    Success = false,
                    Message = "RoleId not found in token."
                });
            }


            // PASS BOTH PARAMETERS
            var result =
                await _service
                    .GetAllowedModules(
                        adminId,
                        roleId);

            return Ok(new
            {
                Success = true,
                AdminId = adminId,
                RoleId = roleId,
                Modules = result
            });
        }
    }
}