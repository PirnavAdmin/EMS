using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExitInterviewController : ControllerBase
    {
        private readonly IExitInterviewService _service;

        public ExitInterviewController(IExitInterviewService service)
        {
            _service = service;
        }

        // Create Exit Interview
        [HttpPost]
        public async Task<IActionResult> Create(CreateExitInterviewDto dto)
        {
            var result = await _service.Create(dto);

            if (!result)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to create exit interview."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Exit interview saved successfully."
            });
        }

        // Get By Resignation
        [HttpGet("resignation/{resignationId}")]
        public async Task<IActionResult> GetByResignation(int resignationId)
        {
            var data = await _service.GetByResignation(resignationId);

            if (data == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Exit interview not found."
                });
            }

            return Ok(data);
        }

        // Get All
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAll();
            return Ok(data);
        }

        // Delete
        [HttpDelete("{exitInterviewId}")]
        public async Task<IActionResult> Delete(int exitInterviewId)
        {
            var result = await _service.Delete(exitInterviewId);

            if (!result)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to delete exit interview."
                });
            }

            return Ok(new
            {
                Success = true,
                Message = "Exit interview deleted successfully."
            });
        }
    }
}