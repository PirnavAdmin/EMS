using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Hangfire;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    [EnableCors("AllowAll")]

    public class PaySlipController : ControllerBase

    {

        private readonly IPaySlipService _service;

        private readonly AppDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;


        public PaySlipController(
     IPaySlipService service,
     AppDbContext context,
     IServiceScopeFactory scopeFactory)
        {
            _service = service;
            _context = context;
            _scopeFactory = scopeFactory;
        }

        //--------------------------------

        // GENERATE SINGLE PAYSLIP

        //--------------------------------
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.Add)]
        [HttpPost("generate")]
        public async Task<IActionResult> GeneratePaySlip(
      string employeeId,
      int year,
      string month,
      decimal? OtherDeductions,
      string? DeductionLabel,
      decimal? TDSPercentage)
        {
            var result = await _service.GeneratePaySlip(
                employeeId,
                year,
                month,
                OtherDeductions ?? 0,
                DeductionLabel,
                TDSPercentage ?? 0);

            return Ok(result);
        }

        //--------------------------------

        // GENERATE ALL PAYSLIPS

        //--------------------------------
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.Add)]
        [HttpPost("generate-all")]
        public IActionResult GenerateAllPaySlips(
      [FromBody] GenerateAllPayslipDto dto)
        {
            if (dto == null)
            {
                return BadRequest("Request is required.");
            }

            if (dto.Year <= 0)
            {
                return BadRequest("Valid year is required.");
            }

            if (dto.Months == null || dto.Months.Count == 0)
            {
                return BadRequest("At least one month is required.");
            }

            if (dto.EmployeeIds == null || dto.EmployeeIds.Count == 0)
            {
                return BadRequest("At least one employee is required.");
            }

            var jobId = BackgroundJob.Enqueue<IPaySlipService>(
                service => service.GenerateAllPaySlips(
                    dto.Year,
                    dto.Months,
                    dto.EmployeeIds));

            return Ok(new
            {
                success = true,
                message = "Payslip generation started.",
                jobId = jobId,
                year = dto.Year,
                months = dto.Months,
                employeeCount = dto.EmployeeIds.Count
            });
        }
        [HttpPost("send-all-emails")]
        public async Task<IActionResult> SendAllPayslipEmails(
    [FromQuery] int year,
    [FromQuery] string month)
        {
            try
            {
                var result =
                    await _service
                        .SendBulkPayslipEmails(
                            year,
                            month);

                if (result.TotalPayslips == 0)
                {
                    return NotFound(new
                    {
                        success = false,

                        message =
                            $"No generated payslips found for " +
                            $"{month} {year}."
                    });
                }


                return Ok(new
                {
                    success =
                        result.FailedCount == 0,

                    message =
                        $"Payslip email process completed " +
                        $"for {month} {year}.",

                    totalPayslips =
                        result.TotalPayslips,

                    sentCount =
                        result.SentCount,

                    failedCount =
                        result.FailedCount,

                    failedEmployees =
                        result.FailedEmployees
                });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        success = false,

                        message =
                            "Failed to send payslip emails.",

                        error =
                            ex.Message
                    });
            }
        }
        //--------------------------------

        // GET RECENT PAYSLIPS

        //--------------------------------
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.View)]
        [HttpGet("recent")]

        public async Task<IActionResult> GetRecent()

        {

            var data = await _service.GetRecentPayslips();

            return Ok(data);

        }

        //--------------------------------

        // PREVIEW PAYSLIP (INLINE VIEW)

        //--------------------------------

        // PREVIEW PAYSLIP (INLINE VIEW)
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.View)]
        [HttpGet("preview/{id}")]

        public async Task<IActionResult> Preview(int id)

        {

            var payslip = await _context.PaySlips.FindAsync(id);

            if (payslip == null)

                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);

            var filePath = Path.Combine(

                Directory.GetCurrentDirectory(),


                "GeneratedPayslips",

                fileName

            );

            if (!System.IO.File.Exists(filePath))

                return NotFound($"File not found: {filePath}");

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            return File(fileBytes, "application/pdf");

        }
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.View)]
        [HttpGet("download/{id}")]

        public async Task<IActionResult> Download(int id)

        {

            var payslip = await _context.PaySlips.FindAsync(id);

            if (payslip == null)

                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);

            var filePath = Path.Combine(

                Directory.GetCurrentDirectory(),


                "GeneratedPayslips",

                fileName

            );

            if (!System.IO.File.Exists(filePath))

                return NotFound($"File not found: {filePath}");

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            return File(

                fileBytes,

                "application/pdf",

                fileName

            );

        }
        //[Authorize]
        //[Permission(ModuleIds.UserPayslip, PermissionAction.View)]

        [HttpGet("my")]

        public async Task<IActionResult> GetMyPayslips()

        {

            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            var employee = await _context.Employees

                .FirstOrDefaultAsync(e => e.Email == email);

            if (employee == null)

                return BadRequest("Employee not found");

            var payslips = await _context.PaySlips

                .Where(p => p.EmployeeId == employee.Employee_Id)

                .OrderByDescending(p => p.Year)

                .ThenByDescending(p => p.Month)

                .ToListAsync();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var result = payslips.Select(p => new

            {

                p.Id,

                p.EmployeeId,

                p.Year,

                p.Month,

                p.CTC,

                p.GrossSalary,

                p.TotalDeductions,

                p.NetSalary,

                p.Generated_On,

                // FIXED URLS

                PreviewUrl = $"/PaySlip/preview/{p.Id}",

                DownloadUrl = $"/PaySlip/download/{p.Id}"

            });

            return Ok(result);

        }

        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.View)]
        [HttpGet("salary-register")]

        public async Task<IActionResult> DownloadSalaryRegister(

     string month,

     int year)

        {

            var validMonths = new[]

            {

        "January","February","March",

        "April","May","June",

        "July","August","September",

        "October","November","December"

    };

            if (!validMonths.Contains(

                    month,

                    StringComparer.OrdinalIgnoreCase))

            {

                return BadRequest(

                    "Invalid month. Please enter month name like May, June, July.");

            }

            var fileBytes =

                await _service

                .DownloadSalaryRegister(

                    month,

                    year);

            return File(

                fileBytes,

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                $"SalaryRegister_{month}_{year}.xlsx");

        }
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.View)]
        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeePayslips(string employeeId)
        {
            try
            {
                var result = await _service.GetEmployeePayslips(employeeId);

                return Ok(new
                {
                    Success = true,
                    Count = result.Count,
                    Payslips = result
                });
            }
            catch (Exception ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }
        //[Authorize]
        //[Permission(ModuleIds.Payroll, PermissionAction.Delete)]
      
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePaySlip(int id)
        {
            try
            {
                await _service.DeletePaySlip(id);

                return Ok(new
                {
                    Success = true,
                    Message = "Payslip deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

    }

}

