using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeClearanceController : ControllerBase
    {
        private readonly IEmployeeClearanceService _service;

        public EmployeeClearanceController(IEmployeeClearanceService service)
        {
            _service = service;
        }

        // Create Clearance
        [HttpPost("create")]
        public async Task<IActionResult> Create(CreateClearanceDto dto)
        {
            var result = await _service.Create(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to create clearance."
                });

            return Ok(new
            {
                Success = true,
                Message = "Clearance created successfully."
            });
        }

        // Department Approval
        [HttpPut("department")]
        public async Task<IActionResult> UpdateDepartment(UpdateDepartmentClearanceDto dto)
        {
            var result = await _service.UpdateDepartment(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to update department clearance."
                });

            return Ok(new
            {
                Success = true,
                Message = "Department clearance updated successfully."
            });
        }

        // Get By Resignation
        [HttpGet("resignation/{resignationId}")]
        public async Task<IActionResult> GetByResignation(int resignationId)
        {
            var data = await _service.GetByResignation(resignationId);

            if (data == null)
                return NotFound(new
                {
                    Success = false,
                    Message = "Clearance not found."
                });

            return Ok(data);
        }

        // Pending Clearances
        [HttpGet("pending")]
        public async Task<IActionResult> GetPending()
        {
            var data = await _service.GetPending();

            return Ok(data);
        }

        // Completed Clearances
        [HttpGet("completed")]
        public async Task<IActionResult> GetCompleted()
        {
            var data = await _service.GetCompleted();

            return Ok(data);
        }
    }
}