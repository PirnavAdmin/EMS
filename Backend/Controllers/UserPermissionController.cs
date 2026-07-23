using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserPermissionController : ControllerBase
    {
        private readonly IUserPermissionService _service;

        public UserPermissionController(IUserPermissionService service)
        {
            _service = service;
        }

        // Save
        [HttpPost]
        public async Task<IActionResult> Save(SaveUserPermissionDto dto)
        {
            await _service.SavePermissions(dto);

            return Ok(new
            {
                Status = true,
                Message = "User permissions saved successfully."
            });
        }

        // Get
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> Get(string employeeId)
        {
            var data = await _service.GetPermissions(employeeId);

            return Ok(data);
        }

        // Allowed Modules
        [HttpGet("allowed/{employeeId}")]
        public async Task<IActionResult> Allowed(string employeeId)
        {
            var data = await _service.GetAllowedModules(employeeId);

            return Ok(data);
        }
    }
}