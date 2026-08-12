using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShiftSwapController : ControllerBase
    {
        private readonly IShiftSwapService _service;

        public ShiftSwapController(IShiftSwapService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift swap not found."
                });

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> RequestSwap(CreateShiftSwapDto dto)
        {
            var result = await _service.RequestSwapAsync(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Shift swap request already exists."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift swap request submitted successfully."
            });
        }

        [HttpPost("approve")]
        public async Task<IActionResult> ApproveSwap(ApproveShiftSwapDto dto)
        {
            var result = await _service.ApproveSwapAsync(dto);

            if (!result)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift swap request not found."
                });

            return Ok(new
            {
                Success = true,
                Message = dto.Approve
                    ? "Shift swap approved successfully."
                    : "Shift swap rejected successfully."
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound(new
                {
                    Success = false,
                    Message = "Shift swap request not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Shift swap deleted successfully."
            });
        }
    }
}