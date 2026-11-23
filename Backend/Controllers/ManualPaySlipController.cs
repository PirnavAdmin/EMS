using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
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
        //[Permission(ModuleIds.Payroll, PermissionAction.Add)]
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