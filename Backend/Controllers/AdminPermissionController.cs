// varsha - Admin permission management for Audit Logs
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

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
            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Request body cannot be null. Please provide a valid JSON body with 'adminId' and 'modules' array." });
            }

            if (dto.Modules == null || dto.Modules.Count == 0)
            {
                return BadRequest(new { success = false, message = "Modules list cannot be null or empty." });
            }

            try
            {
                var result = await _service.SavePermissions(dto);
                return Ok(new { success = true, message = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = ex.Message });
            }
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

                var result = await _service.GetAllowedModules(adminId);
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

        // =========================================================================
        // varsha - Super Admin grant or revoke Audit Logs permission for a specific Admin
        // =========================================================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{adminId}/audit-logs")]
        public async Task<IActionResult> SetAuditLogsPermission(
            int adminId, 
            [FromBody] SetAuditLogsPermissionDto? dto = null,
            [FromQuery] bool? canAccess = null)
        {
            try
            {
                bool access = canAccess ?? dto?.CanAccess ?? true;
                await _service.SetAuditLogsPermissionAsync(adminId, access);
                return Ok(new
                {
                    success = true,
                    message = access 
                        ? $"Audit Logs permission granted successfully to Admin ID {adminId}." 
                        : $"Audit Logs permission revoked successfully from Admin ID {adminId}.",
                    adminId = adminId,
                    hasAuditLogsPermission = access
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // =========================================================================
        // varsha - Get current Audit Logs permission status for a specific Admin
        // =========================================================================
        [Authorize]
        [HttpGet("{adminId}/audit-logs-status")]
        public async Task<IActionResult> GetAuditLogsPermissionStatus(int adminId)
        {
            try
            {
                var result = await _service.GetAuditLogsPermissionStatusAsync(adminId);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
