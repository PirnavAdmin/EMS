using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShiftRosterController : ControllerBase
    {
        private readonly IShiftRosterService _service;

        public ShiftRosterController(IShiftRosterService service)
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
                return NotFound();

            return Ok(data);
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeeRoster(string employeeId)
        {
            var data = await _service.GetEmployeeRosterAsync(employeeId);
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateShiftRosterDto dto)
        {
            var result = await _service.CreateAsync(dto);

            if (!result)
                return BadRequest("Shift roster already exists for this employee on the selected date.");

            return Ok("Shift roster created successfully.");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateShiftRosterDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);

            if (!result)
                return NotFound();

            return Ok("Shift roster updated successfully.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound();

            return Ok("Shift roster deleted successfully.");
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> BulkAssign(BulkShiftRosterDto dto)
        {
            var result = await _service.BulkAssignAsync(dto);

            if (!result)
                return BadRequest();

            return Ok("Bulk shift roster assigned successfully.");
        }
    }
}