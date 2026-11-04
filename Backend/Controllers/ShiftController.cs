using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [Authorize]
    [ApiController]
    public class ShiftController : ControllerBase
    {
        private readonly IShiftService _shiftService;

        public ShiftController(IShiftService shiftService)
        {
            _shiftService = shiftService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _shiftService.GetAllAsync(User);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _shiftService.GetByIdAsync(id, User);

            if (result == null)
                return NotFound(new { message = "Shift not found." });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateShiftDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _shiftService.CreateAsync(dto, User);

            if (result.Contains("already") || result.Contains("Invalid") || result.Contains("cannot"))
                return BadRequest(new { message = result });

            return Ok(new
            {
                success = true,
                message = result
            });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] UpdateShiftDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _shiftService.UpdateAsync(dto, User);

            if (result == "Shift not found.")
                return NotFound(new { message = result });

            if (result.Contains("already") || result.Contains("Invalid") || result.Contains("cannot"))
                return BadRequest(new { message = result });

            return Ok(new
            {
                success = true,
                message = result
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _shiftService.DeleteAsync(id, User);

            if (result == "Shift not found.")
                return NotFound(new { message = result });

            return Ok(new
            {
                success = true,
                message = result
            });
        }
    }
}
