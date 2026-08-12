using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _service;

        public PermissionController(IPermissionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetPermissions()
        {
            var userType = User.FindFirst("UserType")?.Value;

            // Onboarding User
            if (userType == "Onboarding")
            {
                return Ok(new List<object>
        {
            new
            {
                ModuleId = 48,
                ModuleName = "Add Employee",
                Type = "Admin",
                CanAccess = true,
                CanView = true,
                CanAdd = true,
                CanEdit = true,
                CanDelete = false
            }
        });
            }

            // Normal Employee
            var employeeId = User.FindFirst("EmployeeId")?.Value;

            if (string.IsNullOrWhiteSpace(employeeId))
                return Unauthorized("EmployeeId not found in token.");

            var result = await _service.GetFinalPermissions(employeeId);

            return Ok(result);
        }
    }
}