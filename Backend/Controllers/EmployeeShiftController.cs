using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeShiftController : ControllerBase
    {
        private readonly IEmployeeShiftService _employeeShiftService;

        public EmployeeShiftController(IEmployeeShiftService employeeShiftService)
        {
            _employeeShiftService = employeeShiftService;
        }

        [HttpPost("assign")]
        public async Task<IActionResult> AssignShift([FromBody] AssignShiftDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _employeeShiftService.AssignShiftAsync(dto);

            if (result != "Shift assigned successfully.")
                return BadRequest(new { success = false, message = result });

            return Ok(new
            {
                success = true,
                message = result
            });
        }

        [HttpPost("bulk-assign")]
        public async Task<IActionResult> BulkAssign([FromBody] List<AssignShiftDto> dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _employeeShiftService.BulkAssignShiftAsync(dto);

            return Ok(new
            {
                success = true,
                message = result
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _employeeShiftService.GetAllAssignmentsAsync();
            return Ok(result);
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeShift(string employeeId)
        {
            var result = await _employeeShiftService.GetEmployeeShiftAsync(employeeId);

            if (result == null)
                return NotFound(new
                {
                    success = false,
                    message = "No active shift found."
                });

            return Ok(result);
        }

        [HttpDelete("{assignmentId}")]
        public async Task<IActionResult> Delete(int assignmentId)
        {
            var result = await _employeeShiftService.RemoveAssignmentAsync(assignmentId);

            if (result != "Assignment removed successfully.")
                return NotFound(new
                {
                    success = false,
                    message = result
                });

            return Ok(new
            {
                success = true,
                message = result
            });
        }
    }
}