using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
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
        [HttpGet("all")]
        public async Task<IActionResult> GetAllReports()
        {
            var result = await _service.GetAllReports();
            return Ok(result);
        }
    }
}