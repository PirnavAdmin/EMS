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
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    [EnableCors("AllowAll")]
    public class PaySlipController : ControllerBase
    {
        private readonly IPaySlipService _service;
        private readonly AppDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ITenantProvider _tenantProvider;

        public PaySlipController(
            IPaySlipService service,
            AppDbContext context,
            IServiceScopeFactory scopeFactory,
            ITenantProvider tenantProvider)
        {
            _service = service;
            _context = context;
            _scopeFactory = scopeFactory;
            _tenantProvider = tenantProvider;
        }

        private async Task<(bool allowed, PaySlip? payslip)> CanAccessPaySlipAsync(int id, bool requireAdmin = false)
        {
            var payslip = await _context.PaySlips.FindAsync(id);
            if (payslip == null)
                return (false, null);

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (!orgId.HasValue && (adminIds == null || !adminIds.Any()))
                return (false, null);

            bool inTenant = false;
            if (orgId.HasValue && orgId.Value > 0)
            {
                if (payslip.OrganizationId == orgId.Value)
                    inTenant = true;
                else
                    inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, payslip.EmployeeId);
            }
            else if (adminIds != null && adminIds.Any())
            {
                inTenant = await _context.Employees
                    .AnyAsync(e => e.Employee_Id == payslip.EmployeeId && e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value));
            }

            if (!inTenant)
                return (false, null);

            bool isAdmin = await CurrentUserHelper.IsAdminUserAsync(_context, User);
            if (requireAdmin && !isAdmin)
                return (false, null);

            var currentEmpId = CurrentUserHelper.GetEmployeeId(User);
            if (!isAdmin && !string.IsNullOrWhiteSpace(currentEmpId) && !string.Equals(payslip.EmployeeId, currentEmpId, StringComparison.OrdinalIgnoreCase))
            {
                return (false, null);
            }

            return (true, payslip);
        }

        //--------------------------------
        // GENERATE SINGLE PAYSLIP
        //--------------------------------
        [HttpPost("generate")]
        public async Task<IActionResult> GeneratePaySlip(
            string employeeId,
            int year,
            string month,
            decimal? OtherDeductions,
            string? DeductionLabel,
            decimal? TDSPercentage)
        {
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue || (adminIds != null && adminIds.Any()))
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
                if (!inTenant)
                {
                    return NotFound(new { message = "Employee not found in your organization." });
                }
            }

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
        [HttpPost("generate-all")]
        public async Task<IActionResult> GenerateAllPaySlips(
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

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue || (adminIds != null && adminIds.Any()))
            {
                var allowedEmployeeIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                    .Where(e => dto.EmployeeIds.Contains(e.Employee_Id))
                    .Select(e => e.Employee_Id)
                    .ToListAsync();

                if (!allowedEmployeeIds.Any())
                {
                    return BadRequest("None of the specified employees belong to your organization.");
                }

                dto.EmployeeIds = allowedEmployeeIds;
            }

            var orgCode = _tenantProvider.GetCurrentOrganizationCode();

            var jobId = BackgroundJob.Enqueue<IPaySlipService>(
                service => service.GenerateAllPaySlips(
                    dto.Year,
                    dto.Months,
                    dto.EmployeeIds,
                    orgCode));

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
                var result = await _service.SendBulkPayslipEmails(year, month);

                if (result.TotalPayslips == 0)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"No generated payslips found for {month} {year}."
                    });
                }

                return Ok(new
                {
                    success = result.FailedCount == 0,
                    message = $"Payslip email process completed for {month} {year}.",
                    totalPayslips = result.TotalPayslips,
                    sentCount = result.SentCount,
                    failedCount = result.FailedCount,
                    failedEmployees = result.FailedEmployees
                });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    500,
                    new
                    {
                        success = false,
                        message = "Failed to send payslip emails.",
                        error = ex.Message
                    });
            }
        }

        //--------------------------------
        // GET RECENT PAYSLIPS
        //--------------------------------
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent()
        {
            var data = await _service.GetRecentPayslips();
            return Ok(data);
        }

        //--------------------------------
        // PREVIEW PAYSLIP (INLINE VIEW)
        //--------------------------------
        [HttpGet("preview/{id}")]
        public async Task<IActionResult> Preview(int id)
        {
            var (allowed, payslip) = await CanAccessPaySlipAsync(id);
            if (!allowed || payslip == null)
                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);
            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "GeneratedPayslips",
                fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound($"File not found: {filePath}");

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, "application/pdf");
        }

        //--------------------------------
        // DOWNLOAD PAYSLIP
        //--------------------------------
        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            var (allowed, payslip) = await CanAccessPaySlipAsync(id);
            if (!allowed || payslip == null)
                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);
            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "GeneratedPayslips",
                fileName);

            if (!System.IO.File.Exists(filePath))
                return NotFound($"File not found: {filePath}");

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(
                fileBytes,
                "application/pdf",
                fileName);
        }

        //--------------------------------
        // GET MY PAYSLIPS
        //--------------------------------
        [HttpGet("my")]
        public async Task<IActionResult> GetMyPayslips()
        {
            var currentEmpId = CurrentUserHelper.GetEmployeeId(User);
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => (!string.IsNullOrEmpty(currentEmpId) && e.Employee_Id == currentEmpId) || (!string.IsNullOrEmpty(email) && e.Email == email));

            if (employee == null)
                return BadRequest("Employee not found");

            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.PaySlips.AsNoTracking().Where(p => p.EmployeeId == employee.Employee_Id);
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(p => p.OrganizationId == orgId.Value || p.OrganizationId == 0);
            }

            var payslips = await query
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Month)
                .ToListAsync();

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
                PreviewUrl = $"/PaySlip/preview/{p.Id}",
                DownloadUrl = $"/PaySlip/download/{p.Id}"
            });

            return Ok(result);
        }

        //--------------------------------
        // DOWNLOAD SALARY REGISTER
        //--------------------------------
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

            if (!validMonths.Contains(month, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest("Invalid month. Please enter month name like May, June, July.");
            }

            var fileBytes = await _service.DownloadSalaryRegister(month, year);

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"SalaryRegister_{month}_{year}.xlsx");
        }

        //--------------------------------
        // GET EMPLOYEE PAYSLIPS
        //--------------------------------
        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeePayslips(string employeeId)
        {
            try
            {
                var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
                if (orgId.HasValue || (adminIds != null && adminIds.Any()))
                {
                    bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
                    if (!inTenant)
                    {
                        return NotFound(new
                        {
                            Success = false,
                            Message = "Employee not found in your organization."
                        });
                    }
                }

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

        //--------------------------------
        // DELETE PAYSLIP
        //--------------------------------
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePaySlip(int id)
        {
            try
            {
                var (allowed, payslip) = await CanAccessPaySlipAsync(id, requireAdmin: true);
                if (!allowed || payslip == null)
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = "Payslip not found in your organization."
                    });
                }

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
