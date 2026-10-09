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
        // 5. REMOVE / UNASSIGN SHIFT USING ASSIGNMENT ID
        // DELETE: api/EmployeeShift/{assignmentId}
        // =========================================================================
        [HttpDelete("{assignmentId}")]
        public async Task<IActionResult> Delete(int assignmentId)
        {
            if (assignmentId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid assignment ID."
                });
            }

            var result = await _employeeShiftService.RemoveAssignmentAsync(assignmentId);

            if (result != "Assignment removed successfully.")
            {
                return NotFound(new
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
