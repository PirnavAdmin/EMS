using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeShiftController : ControllerBase
    {
        private readonly IEmployeeShiftService _employeeShiftService;

        public EmployeeShiftController(IEmployeeShiftService employeeShiftService)
        {
            _employeeShiftService = employeeShiftService;
        }

        // =========================================================================
        // 1. ASSIGN SHIFT TO AN EMPLOYEE
        // POST: api/EmployeeShift/assign
        // =========================================================================
        [HttpPost("assign")]
        public async Task<IActionResult> AssignShift([FromBody] AssignShiftDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _employeeShiftService.AssignShiftAsync(dto);

            if (result != "Shift assigned successfully.")
            {
                return BadRequest(new
                {
                    success = false,
                    message = result
                });
            }

            return Ok(new
            {
                success = true,
                message = result
            });
        }

        // =========================================================================
        // 2. BULK ASSIGN SHIFTS
        // POST: api/EmployeeShift/bulk-assign
        // =========================================================================
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

        // =========================================================================
        // 3. GET ALL ACTIVE EMPLOYEE SHIFT ASSIGNMENTS
        // GET: api/EmployeeShift
        // =========================================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _employeeShiftService.GetAllAssignmentsAsync();
            return Ok(result);
        }

        // =========================================================================
        // 4. GET CURRENT ACTIVE SHIFT FOR A SPECIFIC EMPLOYEE
        // GET: api/EmployeeShift/{employeeId}
        // =========================================================================
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeShift(string employeeId)
        {
            var result = await _employeeShiftService.GetEmployeeShiftAsync(employeeId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "No active shift found."
                });
            }

            return Ok(result);
        }

        // =========================================================================
        // 5. REMOVE / UNASSIGN SHIFT USING ASSIGNMENT ID OR EMPLOYEE ID
        // DELETE: api/EmployeeShift/{idOrEmployeeId}
        // =========================================================================
        // FIX: Handles DELETE by assignmentId OR by employeeId (prevents 404)
        [HttpDelete("{idOrEmployeeId}")]
        public async Task<IActionResult> Delete(string idOrEmployeeId)
        {
            if (string.IsNullOrWhiteSpace(idOrEmployeeId))
                return BadRequest(new { success = false, message = "Invalid ID." });

            // 1. If it's a valid numeric assignment ID (> 0), try removing direct assignment
            if (int.TryParse(idOrEmployeeId, out int assignmentId) && assignmentId > 0)
            {
                var result = await _employeeShiftService.RemoveAssignmentAsync(assignmentId);
                if (result == "Assignment removed successfully.")
                {
                    return Ok(new { success = true, message = result });
                }
            }

            // 2. Otherwise (assignmentId is 0 or it's an employee ID string like 'EMP001'), unassign by employee ID
            var unassignResult = await _employeeShiftService.UnassignShiftAsync(idOrEmployeeId);
            if (unassignResult == "Shift unassigned from employee successfully.")
            {
                return Ok(new { success = true, message = unassignResult });
            }

            return NotFound(new
            {
                success = false,
                message = unassignResult
            });
        }

        // =========================================================================
        // 6. UNASSIGN SHIFT FROM A SPECIFIC EMPLOYEE
        // PUT: api/EmployeeShift/employee/{employeeId}/unassign
        // =========================================================================
        [HttpPut("employee/{employeeId}/unassign")]
        public async Task<IActionResult> UnassignShift(string employeeId)
        {
            var result = await _employeeShiftService.UnassignShiftAsync(employeeId);

            if (result == "Employee not found.")
            {
                return NotFound(new
                {
                    success = false,
                    message = result
                });
            }

            if (result != "Shift unassigned from employee successfully.")
            {
                return BadRequest(new
                {
                    success = false,
                    message = result
                });
            }

            return Ok(new
            {
                success = true,
                message = result
            });
        }
    }
}
