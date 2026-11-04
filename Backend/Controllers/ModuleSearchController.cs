using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ModuleSearchController : ControllerBase
    {
        private readonly ModuleSearchService _service;

        public ModuleSearchController(ModuleSearchService service)
        {
            _service = service;
        }

        // 🔍 Search Module by Keyword
        [HttpGet("search")]
        public async Task<IActionResult> SearchModule([FromQuery] string keyword)
        {
            // ✅ Validation
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "Keyword is required" });

            // ✅ Call service
            var result = await _service.SearchModule(keyword);

            // ✅ Handle not found
            if (result == null)
                return NotFound(new { message = "Module not found" });

            // ✅ Success response
            return Ok(result);
        }
    }
}