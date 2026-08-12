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
        public async Task<IActionResult> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateShiftChangeRequestDto dto)
        {
            var result = await _service.CreateAsync(dto);

            if (!result)
                return BadRequest("Pending request already exists.");

            return Ok("Shift change request submitted successfully.");
        }

        [HttpPost("approve")]
        public async Task<IActionResult> Approve(ApproveShiftChangeRequestDto dto)
        {
            var result = await _service.ApproveAsync(dto);

            if (!result)
                return NotFound();

            return Ok("Request processed successfully.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound();

            return Ok("Deleted successfully.");
        }
    }
}