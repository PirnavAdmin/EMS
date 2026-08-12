using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class ShiftRotationController : ControllerBase
    {
        private readonly IShiftRotationService _service;

        public ShiftRotationController(IShiftRotationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
                return NotFound(new
                {
                    Message = "Shift Rotation not found."
                });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateShiftRotationDto dto)
        {
            var created = await _service.CreateAsync(dto);

            if (!created)
            {
                return BadRequest(new
                {
                    Message = "Active Shift Rotation already exists for this employee."
                });
            }

            return Ok(new
            {
                Message = "Shift Rotation created successfully."
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateShiftRotationDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);

            if (!updated)
            {
                return NotFound(new
                {
                    Message = "Shift Rotation not found."
                });
            }

            return Ok(new
            {
                Message = "Shift Rotation updated successfully."
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    Message = "Shift Rotation not found."
                });
            }

            return Ok(new
            {
                Message = "Shift Rotation deleted successfully."
            });
        }
    }
}