using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/manual-payslip")]
    [ApiController]
    [EnableCors("AllowAll")]
    public class ManualPaySlipController : ControllerBase
    {
        private readonly IManualPayslipService _service;

        public ManualPaySlipController(IManualPayslipService service)
        {
            _service = service;
        }

        //--------------------------------
        // 🔥 GENERATE MANUAL PAYSLIP
        //--------------------------------
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateManualPaySlip([FromBody] ManualPaySlipDto dto)
        {
            try
            {
                var filePath = await _service.GenerateManualPaySlip(dto);

                return Ok(new
                {
                    message = "Manual payslip generated successfully",
                    filePath = filePath
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}