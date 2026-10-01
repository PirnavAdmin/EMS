using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    [Authorize]

    public class EmployeeResignationController : ControllerBase

    {

        private readonly IEmployeeResignationService _service;

        public EmployeeResignationController(

            IEmployeeResignationService service)

        {

            _service = service;

        }

        // ============================================================

        // APPLY

        // ============================================================

        [Authorize]
        [HttpPost("apply")]
        public async Task<IActionResult> Apply([FromBody] CreateResignationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Get EmployeeId from JWT token
            var employeeId = User.FindFirst("EmployeeId")?.Value;

            if (string.IsNullOrEmpty(employeeId))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "EmployeeId not found in token."
                });
            }

            var result = await _service.ApplyResignation(dto, employeeId);

            if (!result)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Unable to submit resignation. Employee may be inactive, or a pending resignation already exists."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Resignation request submitted successfully. HR, Admin and Manager have been notified."
            });
        }  // ============================================================

        // UPDATE

        // ============================================================

        [HttpPut("update")]

        public async Task<IActionResult> Update(

            [FromBody] UpdateResignationDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            var result =

                await _service.UpdateResignation(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to update resignation. It may already be processed."

                });

            }

            return Ok(new

            {

                success = true,

                message = "Resignation updated successfully."

            });

        }

        // ============================================================

        // DELETE / CANCEL

        // ============================================================

        [HttpDelete("{resignationId}")]

        public async Task<IActionResult> Delete(

            int resignationId)

        {

            var result =

                await _service.DeleteResignation(resignationId);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to cancel resignation. It may already be processed."

                });

            }

            return Ok(new

            {

                success = true,

                message = "Resignation cancelled successfully."

            });

        }

        // ============================================================

        // GET ALL

        // ============================================================

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var result = await _service.GetAll();

            return Ok(result);

        }

        // ============================================================

        // GET BY ID

        // ============================================================

        [HttpGet("{resignationId}")]

        public async Task<IActionResult> GetById(

            int resignationId)

        {

            var result =

                await _service.GetById(resignationId);

            if (result == null)

            {

                return NotFound(new

                {

                    success = false,

                    message = "Resignation not found."

                });

            }

            return Ok(result);

        }

        // ============================================================

        // GET EMPLOYEE HISTORY

        // ============================================================

        [HttpGet("employee/{employeeId}")]

        public async Task<IActionResult> GetByEmployee(

            string employeeId)

        {

            var result =

                await _service.GetByEmployee(employeeId);

            return Ok(result);

        }

        // ============================================================

        // GET PENDING APPROVALS

        // ============================================================

        [HttpGet("pending")]

        public async Task<IActionResult> GetPendingApprovals()

        {

            var result =

                await _service.GetPendingApprovals();

            return Ok(result);

        }

        // ============================================================

        // APPROVE / REJECT

        // ============================================================

        [HttpPut("approval")]

        public async Task<IActionResult> ExitApproval(

            [FromBody] ExitApprovalDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            var result =

                await _service.ExitApproval(dto, User);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to process the exit request. It may already have been processed or you may not have permission."

                });

            }

            return Ok(new

            {

                success = true,

                message = dto.IsApproved

                    ? "Exit request approved successfully. Employee has been marked inactive."

                    : "Exit request rejected successfully. Employee remains active."

            });

        }

    }

}
