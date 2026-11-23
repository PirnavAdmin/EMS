using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeWeeklyOffController : ControllerBase
    {
        private readonly IEmployeeWeeklyOffService _service;

        public EmployeeWeeklyOffController(IEmployeeWeeklyOffService service)
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
                    Success = false,
                    Message = "Weekly Off record not found."
                });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateEmployeeWeeklyOffDto dto)
        {
            var result = await _service.CreateAsync(dto);

            if (!result)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Weekly Off already assigned."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Weekly Off created successfully."
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateEmployeeWeeklyOffDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            if (!result)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Weekly Off record not found."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Weekly Off updated successfully."
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Weekly Off record not found."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Weekly Off deleted successfully."
            });
        }
    }
}