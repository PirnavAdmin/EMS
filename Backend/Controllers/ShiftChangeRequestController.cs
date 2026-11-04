using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShiftChangeRequestController : ControllerBase
    {
        private readonly IShiftChangeRequestService _service;

        public ShiftChangeRequestController(IShiftChangeRequestService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? employeeId,
            [FromQuery] string? status)
        {
            var data = await _service.GetAllAsync(employeeId, status);
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
                return NotFound(new { Success = false, Message = "Shift change request not found." });

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateShiftChangeRequestDto dto)
        {
            var result = await _service.CreateDetailedAsync(dto);

            if (!result.Success)
                return BadRequest(new { Success = false, Message = result.Message });

            return Ok(new { Success = true, Message = result.Message });
        }

        // PUT /api/ShiftChangeRequest/{id}/approve
        [HttpPut("{id}/approve")]
        public async Task<IActionResult> Approve(int id, [FromQuery] string? approvedBy)
        {
            var user = approvedBy ?? User.FindFirst("Role")?.Value ?? User.FindFirst("role")?.Value ?? User.FindFirst("Name")?.Value ?? "Admin";
            var result = await _service.ApproveAsync(id, user);

            if (!result)
                return NotFound(new { Success = false, Message = "Shift change request not found or cannot be approved in current state." });

            return Ok(new { Success = true, Message = $"Shift change request approved by {user} and shift applied successfully." });
        }

        // PUT /api/ShiftChangeRequest/{id}/reject
        [HttpPut("{id}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectRequestDto? dto)
        {
            var user = dto?.RejectedBy ?? User.FindFirst("Role")?.Value ?? User.FindFirst("role")?.Value ?? User.FindFirst("Name")?.Value ?? "Admin";
            var result = await _service.RejectAsync(id, dto?.Remarks, user);

            if (!result)
                return NotFound(new { Success = false, Message = "Shift change request not found or cannot be rejected in current state." });

            return Ok(new { Success = true, Message = $"Shift change request rejected by {user}." });
        }

        [HttpPost("approve")]
        public async Task<IActionResult> ApproveLegacy([FromBody] ApproveShiftChangeRequestDto dto)
        {
            var user = dto.ApprovedBy ?? User.FindFirst("Role")?.Value ?? User.FindFirst("role")?.Value ?? User.FindFirst("Name")?.Value ?? "Admin";
            var result = dto.Approve
                ? await _service.ApproveAsync(dto.RequestId, user)
                : await _service.RejectAsync(dto.RequestId, null, user);

            if (!result)
                return NotFound(new { Success = false, Message = "Shift change request not found or cannot be processed." });

            return Ok(new
            {
                Success = true,
                Message = dto.Approve ? $"Request approved by {user} successfully." : $"Request rejected by {user} successfully."
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound(new { Success = false, Message = "Shift change request not found or already approved." });

            return Ok(new { Success = true, Message = "Shift change request deleted successfully." });
        }
    }
}