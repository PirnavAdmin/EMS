using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
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
        private readonly AppDbContext _context;

        public ManualPaySlipController(IManualPayslipService service, AppDbContext context)
        {
            _service = service;
            _context = context;
        }

        //--------------------------------
        // 🔥 GENERATE MANUAL PAYSLIP
        //--------------------------------
        //[Permission(ModuleIds.Payroll, PermissionAction.Add)]
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateManualPaySlip([FromBody] ManualPaySlipDto dto)
        {
            if (dto == null)
            {
                return BadRequest("Request body is required.");
            }

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue || (adminIds != null && adminIds.Any()))
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, dto.EmployeeId);
                if (!inTenant)
                {
                    return NotFound(new { message = "Employee not found in your organization." });
                }
            }

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