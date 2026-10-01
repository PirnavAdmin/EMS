using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    [Authorize]

    public class EmployeeClearanceController : ControllerBase

    {

        private readonly IEmployeeClearanceService _service;

        public EmployeeClearanceController(

            IEmployeeClearanceService service)

        {

            _service = service;

        }

        // ============================================================

        // CREATE CLEARANCE

        // ============================================================

        [HttpPost("create")]

        public async Task<IActionResult> Create(

            [FromBody] CreateClearanceDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            var result = await _service.Create(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to create clearance. " +

                        "The resignation may not be approved, " +

                        "or clearance may already exist."

                });

            }

            return Ok(new

            {

                success = true,

                message = "Employee clearance created successfully."

            });

        }

        // ============================================================

        // DEPARTMENT APPROVAL / REJECTION

        // ============================================================

        [HttpPut("department")]

        public async Task<IActionResult> UpdateDepartment(

            [FromBody] UpdateDepartmentClearanceDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            var result =

                await _service.UpdateDepartment(dto);

            if (!result)

            {

                return BadRequest(new

                {

                    success = false,

                    message =

                        "Unable to update department clearance. " +

                        "It may already be processed, completed, " +

                        "or the resignation is not approved."

                });

            }

            return Ok(new

            {

                success = true,

                message =

                    dto.IsApproved

                        ? "Department clearance approved successfully."

                        : "Department clearance rejected successfully."

            });

        }

        // ============================================================

        // GET CLEARANCE BY RESIGNATION

        // ============================================================

        [HttpGet("resignation/{resignationId}")]

        public async Task<IActionResult> GetByResignation(

            int resignationId)

        {

            var data =

                await _service.GetByResignation(resignationId);

            if (data == null)

            {

                return NotFound(new

                {

                    success = false,

                    message = "Clearance not found."

                });

            }

            return Ok(data);

        }

        // ============================================================

        // GET PENDING CLEARANCES

        // ============================================================

        [HttpGet("pending")]

        public async Task<IActionResult> GetPending()

        {

            var data = await _service.GetPending();

            return Ok(data);

        }

        // ============================================================

        // GET COMPLETED CLEARANCES

        // ============================================================

        [HttpGet("completed")]

        public async Task<IActionResult> GetCompleted()

        {

            var data = await _service.GetCompleted();

            return Ok(data);

        }

    }

}
