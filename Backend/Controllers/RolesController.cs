using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Roles controller with complete Audit Logging
    //[Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service
        private readonly AppDbContext _context; // varsha - DB context to capture pre-update state

        public RolesController(
            IRoleService roleService,
            IAuditLogService auditLogService,
            AppDbContext context) // varsha
        {
            _roleService = roleService;
            _auditLogService = auditLogService; // varsha
            _context = context; // varsha
        }

        //[Permission(ModuleIds.Roles, PermissionAction.Add)]
        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
        {
            try
            {
                var role = await _roleService.CreateRole(dto);

                // varsha - Audit role creation
                await _auditLogService.LogCreateAsync(
                    module: "UserManagement",
                    entityName: "Role",
                    entityId: role?.RoleId.ToString() ?? dto.Name,
                    description: $"Created role '{dto.Name}'",
                    newValues: dto,
                    user: User);

                return Ok(new
                {
                    message = "Role created successfully",
                    data = role
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        //[Permission(ModuleIds.Roles, PermissionAction.View)]
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _roleService.GetRoles();

            return Ok(roles);
        }

        //[Permission(ModuleIds.Roles, PermissionAction.Edit)]
        [HttpPut("{roleId}")]
        public async Task<IActionResult> UpdateRole(int roleId, [FromBody] CreateRoleDto dto)
        {
            // varsha - Fetch existing role before update for delta comparison
            var existingRole = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RoleId == roleId);
            var oldValues = existingRole != null ? new
            {
                existingRole.Name,
                existingRole.IsActive
            } : null;

            var role = await _roleService.UpdateRole(roleId, dto);

            if (role == null)
            {
                return NotFound(new
                {
                    message = "Role not found"
                });
            }

            // varsha - Audit role update with full old and new values delta
            await _auditLogService.LogUpdateAsync(
                module: "UserManagement",
                entityName: "Role",
                entityId: roleId.ToString(),
                description: $"Updated role '{dto.Name}' (ID: {roleId})",
                oldValues: oldValues,
                newValues: dto,
                user: User);

            return Ok(new
            {
                message = "Role updated successfully",
                data = role
            });
        }

        //[Permission(ModuleIds.Roles, PermissionAction.Delete)]
        [HttpDelete("{roleId}")]
        public async Task<IActionResult> DeleteRole(int roleId)
        {
            try
            {
                // varsha - Capture existing role state before deletion
                var existingRole = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RoleId == roleId);
                var oldValues = existingRole != null ? new
                {
                    existingRole.RoleId,
                    existingRole.Name,
                    existingRole.IsActive
                } : null;

                var result = await _roleService.DeleteRole(roleId);

                if (!result)
                {
                    return NotFound(new
                    {
                        message = "Role not found"
                    });
                }

                // varsha - Audit role deletion
                await _auditLogService.LogDeleteAsync(
                    module: "UserManagement",
                    entityName: "Role",
                    entityId: roleId.ToString(),
                    description: $"Deleted role '{existingRole?.Name}' (ID: {roleId})",
                    oldValues: oldValues,
                    user: User);

                return Ok(new
                {
                    message = "Role deleted successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}