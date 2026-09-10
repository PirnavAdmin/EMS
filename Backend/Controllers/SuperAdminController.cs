using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ISuperAdminService _superAdminService;

        public SuperAdminController(ISuperAdminService superAdminService)
        {
            _superAdminService = superAdminService;
        }

        private string GetClientIp()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }

        // ============================================
        // 1. SUPER ADMIN LOGIN (Public)
        // ============================================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] SuperAdminLoginDto dto)
        {
            var result = await _superAdminService.Login(dto);

            dynamic response = result;

            if (response.Success == false)
            {
                string errorCode = response.ErrorCode ?? string.Empty;
                if (errorCode == "INVALID_CREDENTIALS")
                {
                    return Unauthorized(result);
                }
                if (errorCode == "ACCOUNT_INACTIVE")
                {
                    return StatusCode(StatusCodes.Status403Forbidden, result);
                }
                return BadRequest(result);
            }

            return Ok(result);
        }

        // ============================================
        // 2. DASHBOARD (Backward compatible + Enhanced)
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var result = await _superAdminService.GetDashboard();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("dashboard/enhanced")]
        public async Task<IActionResult> GetEnhancedDashboard()
        {
            try
            {
                var result = await _superAdminService.GetEnhancedDashboard();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        // ============================================
        // 3. ORGANIZATION / CLIENT MANAGEMENT
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations")]
        public async Task<IActionResult> GetOrganizations(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _superAdminService.GetOrganizations(search, status, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/{id:int}")]
        public async Task<IActionResult> GetOrganizationById(int id)
        {
            try
            {
                var org = await _superAdminService.GetOrganizationById(id);
                if (org == null)
                    return NotFound(new { Message = "Organization not found." });

                return Ok(org);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("organizations")]
        public async Task<IActionResult> CreateOrganization([FromBody] CreateOrganizationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var org = await _superAdminService.CreateOrganization(dto, User, GetClientIp());
                return CreatedAtAction(nameof(GetOrganizationById), new { id = org.Id }, org);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("organizations/{id:int}")]

        //[HttpPut("organizations/{id}")]
        //[Authorize(Roles = "SuperAdmin")]
        public async Task<IActionResult> UpdateOrganization(
    int id,
    [FromBody] UpdateOrganizationDto dto)
        {
            try
            {
                var user = User;

                var ipAddress =
                    HttpContext.Connection.RemoteIpAddress?.ToString();

                var result = await _superAdminService.UpdateOrganization(
                    id,
                    dto,
                    user,
                    ipAddress);

                if (result == null)
                {
                    return NotFound(new
                    {
                        message = "Organization not found."
                    });
                }

                return Ok(new
                {
                    message = "Organization updated successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "An error occurred while updating the organization.",
                    error = ex.Message
                });
            }
        }
        //public async Task<IActionResult> UpdateOrganization(int id, [FromBody] UpdateOrganizationDto dto)
        //{
        //    try
        //    {
        //        if (!ModelState.IsValid)
        //            return BadRequest(ModelState);

        //        var org = await _superAdminService.UpdateOrganization(id, dto, User, GetClientIp());
        //        if (org == null)
        //            return NotFound(new { Message = "Organization not found." });

        //        return Ok(new { Message = "Organization updated successfully.", Data = org });
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(new { Message = ex.Message });
        //    }
        //}

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("organizations/{id:int}/status")]
        public async Task<IActionResult> UpdateOrganizationStatus(int id, [FromBody] UpdateEntityStatusDto dto)
        {
            try
            {
                bool updated = await _superAdminService.UpdateOrganizationStatus(id, dto, User, GetClientIp());
                if (!updated)
                    return NotFound(new { Message = "Organization not found." });

                return Ok(new { Message = "Organization status updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("organizations/{id:int}")]
        public async Task<IActionResult> DeleteOrganization(int id)
        {
            try
            {
                var (success, message) = await _superAdminService.DeleteOrganization(id, User, GetClientIp());
                if (!success)
                    return BadRequest(new { Message = message });

                return Ok(new { Message = message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 3b. ORGANIZATION SUBSCRIPTIONS
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("organizations/{organizationId:int}/subscription")]
        public async Task<IActionResult> CreateOrganizationSubscription(int organizationId, [FromBody] CreateOrganizationSubscriptionDto dto)
        {
            try
            {
                dto.OrganizationId = organizationId;
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _superAdminService.CreateOrganizationSubscription(dto, User, GetClientIp());
                return Ok(new { Message = "Organization subscription created successfully.", Data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/{organizationId:int}/subscription")]
        public async Task<IActionResult> GetOrganizationSubscription(int organizationId)
        {
            try
            {
                var result = await _superAdminService.GetOrganizationSubscription(organizationId);
                if (result == null)
                    return NotFound(new { Message = "No subscription found for this organization." });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("organizations/{organizationId:int}/subscription")]
        public async Task<IActionResult> UpdateOrganizationSubscription(int organizationId, [FromBody] UpdateOrganizationSubscriptionDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _superAdminService.UpdateOrganizationSubscription(organizationId, dto, User, GetClientIp());
                return Ok(new { Message = "Organization subscription updated successfully.", Data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/{organizationId:int}/subscription/usage")]
        public async Task<IActionResult> GetOrganizationSubscriptionUsage(int organizationId)
        {
            try
            {
                var result = await _superAdminService.GetOrganizationSubscriptionUsage(organizationId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/subscriptions")]
        public async Task<IActionResult> GetAllOrganizationSubscriptions([FromQuery] OrganizationSubscriptionFilterDto filter)
        {
            try
            {
                var result = await _superAdminService.GetAllOrganizationSubscriptions(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 4. ADMIN MANAGEMENT
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("admins")]
        public async Task<IActionResult> GetAdmins(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int? organizationId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _superAdminService.GetAdmins(search, isActive, organizationId, page, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("admins/{id:int}")]
        public async Task<IActionResult> GetAdminById(int id)
        {
            try
            {
                var admin = await _superAdminService.GetAdminById(id);
                if (admin == null)
                    return NotFound(new { Message = "Admin not found." });

                return Ok(admin);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("admins")]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateSuperAdminAdminDto dto)
        {
            try
            {
                if (dto == null || !ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .Where(msg => !string.IsNullOrWhiteSpace(msg))
                        .ToList();

                    var errorMsg = errors.Count > 0
                        ? string.Join("; ", errors)
                        : "Invalid request payload. Please ensure the JSON body is well-formed and all string values (e.g. email, password) are wrapped in double quotes.";

                    return BadRequest(new
                    {
                        Success = false,
                        Message = errorMsg,
                        Errors = errors
                    });
                }

                var admin = await _superAdminService.CreateAdmin(dto, User, GetClientIp());
                return CreatedAtAction(nameof(GetAdminById), new { id = admin.Id }, admin);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Success = false, Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("admins/{id:int}")]
        public async Task<IActionResult> UpdateAdmin(int id, [FromBody] UpdateSuperAdminAdminDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var admin = await _superAdminService.UpdateAdmin(id, dto, User, GetClientIp());
                if (admin == null)
                    return NotFound(new { Message = "Admin not found." });

                return Ok(new { Message = "Admin updated successfully.", Data = admin });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("admins/{id:int}/assign-organization")]
        public async Task<IActionResult> AssignAdminOrganization(int id, [FromBody] AssignAdminOrganizationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var admin = await _superAdminService.AssignAdminOrganization(id, dto, User, GetClientIp());
                if (admin == null)
                    return NotFound(new { Message = "Admin not found." });

                return Ok(new { Message = "Admin organization assignment updated successfully.", Data = admin });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("admins/{id:int}/status")]

        public async Task<IActionResult> UpdateAdminStatus(int id, [FromBody] UpdateEntityStatusDto dto)
        {
            try
            {
                bool updated = await _superAdminService.UpdateAdminStatus(id, dto, User, GetClientIp());
                if (!updated)
                    return NotFound(new { Message = "Admin not found." });

                return Ok(new { Message = "Admin status updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("admins/{id:int}/reset-password")]
        //public async Task<IActionResult> ResetAdminPassword(int id, [FromBody] ResetAdminPasswordDto dto)
        //{
        //    try
        //    {
        //        if (!ModelState.IsValid)
        //            return BadRequest(ModelState);

        //        bool success = await _superAdminService.ResetAdminPassword(id, dto, User, GetClientIp());
        //        if (!success)
        //            return NotFound(new { Message = "Admin not found." });

        //        return Ok(new { Message = "Admin password reset successfully." });
        //    }
        //    catch (Exception ex)
        //    {
        //        return BadRequest(new { Message = ex.Message });
        //    }
        //}

        public async Task<IActionResult> ResetAdminPassword(
            int id,
            [FromBody] ResetAdminPasswordDto dto)
        {
            try
            {
                var result = await _superAdminService.ResetAdminPassword(
                    id,
                    dto,
                    User,
                    HttpContext.Connection.RemoteIpAddress?.ToString());

                if (!result)
                {
                    return NotFound(new
                    {
                        message = "Admin not found."
                    });
                }

                return Ok(new
                {
                    message = "Password changed successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("admins/{id:int}")]
        public async Task<IActionResult> DeleteAdmin(int id)
        {
            try
            {
                var (success, message) = await _superAdminService.DeleteAdmin(id, User, GetClientIp());
                if (!success)
                    return BadRequest(new { Message = message });

                return Ok(new { Message = message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("organizations/{organizationId:int}/admins/{adminId:int}")]
        public async Task<IActionResult> RemoveAdminFromOrganization(int organizationId, int adminId)
        {
            try
            {
                var (success, message) = await _superAdminService.RemoveAdminFromOrganization(organizationId, adminId, User, GetClientIp());
                if (!success)
                    return BadRequest(new { Message = message });

                return Ok(new { Message = message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 5. EMPLOYEE MONITORING (Organization-Scoped)
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/{organizationId:int}/employees")]
        public async Task<IActionResult> GetEmployeesByOrganization(int organizationId, [FromQuery] SuperAdminEmployeeFilterDto filter)
        {
            try
            {
                var result = await _superAdminService.GetEmployeesByOrganization(organizationId, filter);
                if (result == null)
                    return NotFound(new { Message = "Organization not found." });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("organizations/{organizationId:int}/employees/{employeeId}")]
        public async Task<IActionResult> GetEmployeeByOrganizationAndId(int organizationId, string employeeId)
        {
            try
            {
                var emp = await _superAdminService.GetEmployeeByOrganizationAndId(organizationId, employeeId);
                if (emp == null)
                    return NotFound(new { Message = "Employee not found in this organization." });

                return Ok(emp);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("organizations/{organizationId:int}/employees/{employeeId}/status")]
        public async Task<IActionResult> UpdateEmployeeStatusByOrganization(int organizationId, string employeeId, [FromBody] UpdateEntityStatusDto dto)
        {
            try
            {
                bool updated = await _superAdminService.UpdateEmployeeStatusByOrganization(organizationId, employeeId, dto, User, GetClientIp());
                if (!updated)
                    return NotFound(new { Message = "Employee not found in this organization." });

                return Ok(new { Message = "Employee status updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 6. ROLE MANAGEMENT
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("roles")]
        public async Task<IActionResult> GetAllRoles()
        {
            try
            {
                var roles = await _superAdminService.GetAllRoles();
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
        {
            try
            {
                var role = await _superAdminService.CreateRole(dto, User, GetClientIp());
                return Ok(new { Message = "Role created successfully.", Data = role });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("roles/{roleId:int}")]
        public async Task<IActionResult> UpdateRole(int roleId, [FromBody] CreateRoleDto dto)
        {
            try
            {
                var role = await _superAdminService.UpdateRole(roleId, dto, User, GetClientIp());
                if (role == null)
                    return NotFound(new { Message = "Role not found." });

                return Ok(new { Message = "Role updated successfully.", Data = role });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("roles/{roleId:int}/status")]
        public async Task<IActionResult> ToggleRoleStatus(int roleId, [FromBody] UpdateEntityStatusDto dto)
        {
            try
            {
                bool isActive = dto.IsActive ?? string.Equals(dto.Status, "Active", StringComparison.OrdinalIgnoreCase);
                bool success = await _superAdminService.ToggleRoleStatus(roleId, isActive, User, GetClientIp());
                if (!success)
                    return NotFound(new { Message = "Role not found." });

                return Ok(new { Message = "Role status updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("roles/{roleId:int}/users")]
        public async Task<IActionResult> GetUsersByRole(int roleId)
        {
            try
            {
                var users = await _superAdminService.GetUsersByRole(roleId);
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 7. AUDIT LOGS
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogFilterDto filter)
        {
            try
            {
                var result = await _superAdminService.GetAuditLogs(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("audit-logs/modules")]
        public async Task<IActionResult> GetAuditModules()
        {
            try
            {
                var modules = await _superAdminService.GetAuditModules();
                return Ok(modules);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("audit-logs/actions")]
        public async Task<IActionResult> GetAuditActions()
        {
            try
            {
                var actions = await _superAdminService.GetAuditActions();
                return Ok(actions);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 8. SYSTEM SETTINGS
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("settings")]
        public async Task<IActionResult> GetSystemSettings()
        {
            try
            {
                var settings = await _superAdminService.GetSystemSettings();
                return Ok(settings);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSystemSettings([FromBody] UpdateSystemSettingsDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var settings = await _superAdminService.UpdateSystemSettings(dto, User, GetClientIp());
                return Ok(new { Message = "System settings updated successfully.", Data = settings });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 9. GLOBAL SEARCH
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("search")]
        public async Task<IActionResult> GlobalSearch([FromQuery] string query)
        {
            try
            {
                var result = await _superAdminService.GlobalSearch(query);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        // ============================================
        // 10. NOTIFICATIONS & ALERTS
        // ============================================
        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            try
            {
                var result = await _superAdminService.GetNotifications(unreadOnly);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("notifications/unread-count")]
        public async Task<IActionResult> GetUnreadNotificationCount()
        {
            try
            {
                int count = await _superAdminService.GetUnreadNotificationCount();
                return Ok(new { UnreadCount = count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("notifications/{id:int}/read")]
        public async Task<IActionResult> MarkNotificationAsRead(int id)
        {
            try
            {
                bool success = await _superAdminService.MarkNotificationAsRead(id);
                if (!success)
                    return NotFound(new { Message = "Notification not found." });

                return Ok(new { Message = "Notification marked as read." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("notifications/read-all")]
        public async Task<IActionResult> MarkAllNotificationsAsRead()
        {
            try
            {
                await _superAdminService.MarkAllNotificationsAsRead();
                return Ok(new { Message = "All notifications marked as read." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}