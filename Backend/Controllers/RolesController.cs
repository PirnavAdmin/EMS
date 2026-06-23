using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;

        public RolesController(IRoleService roleService)
        {
            _roleService = roleService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleDto dto)
        {
            try
            {
                var role = await _roleService.CreateRole(dto);

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

        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _roleService.GetRoles();

            return Ok(roles);
        }

        [HttpPut("{roleId}")]
        public async Task<IActionResult> UpdateRole(int roleId, [FromBody] CreateRoleDto dto)
        {
            var role = await _roleService.UpdateRole(roleId, dto);

            if (role == null)
            {
                return NotFound(new
                {
                    message = "Role not found"
                });
            }

            return Ok(new
            {
                message = "Role updated successfully",
                data = role
            });
        }

        [HttpDelete("{roleId}")]
        public async Task<IActionResult> DeleteRole(int roleId)
        {
            try
            {
                var result = await _roleService.DeleteRole(roleId);

                if (!result)
                {
                    return NotFound(new
                    {
                        message = "Role not found"
                    });
                }

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