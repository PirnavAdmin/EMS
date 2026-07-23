using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
    [Route("api/reports")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly ReportsService _service;

        public ReportsController(ReportsService service)
        {
            _service = service;
        }

        // -----------------------------------------
        // GET: api/reports/all
        // -----------------------------------------
        //[Permission(ModuleIds.Reports, PermissionAction.View)]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllReports()
        {
            var result = await _service.GetAllReports();
            return Ok(result);
        }
    }
}