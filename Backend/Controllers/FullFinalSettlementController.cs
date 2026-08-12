using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FullFinalSettlementController : ControllerBase
    {
        private readonly IFullFinalSettlementService _service;

        public FullFinalSettlementController(IFullFinalSettlementService service)
        {
            _service = service;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate(GenerateSettlementDto dto)
        {
            var result = await _service.GenerateSettlement(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to generate settlement."
                });

            return Ok(new
            {
                Success = true,
                Message = "Settlement generated successfully."
            });
        }

        [HttpPut("approve")]
        public async Task<IActionResult> Approve(ApproveSettlementDto dto)
        {
            var result = await _service.ApproveSettlement(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to approve settlement."
                });

            return Ok(new
            {
                Success = true,
                Message = "Settlement updated successfully."
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAll());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> Get(string employeeId)
        {
            var data = await _service.GetEmployeeSettlement(employeeId);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpDelete("{settlementId}")]
        public async Task<IActionResult> Delete(int settlementId)
        {
            var result = await _service.DeleteSettlement(settlementId);

            if (!result)
                return BadRequest();

            return Ok(new
            {
                Success = true,
                Message = "Settlement deleted successfully."
            });
        }
    }
}