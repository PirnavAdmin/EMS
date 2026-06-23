using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Cors;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    [EnableCors("AllowAll")]

    public class PaySlipController : ControllerBase

    {

        private readonly IPaySlipService _service;

        private readonly AppDbContext _context;

        public PaySlipController(IPaySlipService service, AppDbContext context)

        {

            _service = service;

            _context = context;

        }

        //--------------------------------

        // GENERATE SINGLE PAYSLIP

        //--------------------------------

        [HttpPost("generate")]

        public async Task<IActionResult> GeneratePaySlip(

            string employeeId,

            int year,

            string month,

            decimal? OtherDeductions)

        {

            try
            {
                var result = await _service.GeneratePaySlip(employeeId, year, month, OtherDeductions ?? 0);

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
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

        //--------------------------------

        // GENERATE ALL PAYSLIPS

        //--------------------------------

        [HttpPost("generate-all")]

        public async Task<IActionResult> GenerateAll(int year, string month)

        {

            try
            {
                var result = await _service.GenerateAllPaySlips(year, month);

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
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

        // PREVIEW PAYSLIP (INLINE VIEW)

        [HttpGet("preview/{id}")]

        public async Task<IActionResult> Preview(int id)

        {

            var payslip = await _context.PaySlips.FindAsync(id);

            if (payslip == null)

                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);

            var filePath = Path.Combine(

                Directory.GetCurrentDirectory(),

                "wwwroot",

                "GeneratedPayslips",

                fileName

            );

            if (!System.IO.File.Exists(filePath))

                return NotFound($"File not found: {filePath}");

            var fileBytes = System.IO.File.ReadAllBytes(filePath);

            return File(fileBytes, "application/pdf");

        }

        [HttpGet("download/{id}")]

        public async Task<IActionResult> Download(int id)

        {

            var payslip = await _context.PaySlips.FindAsync(id);

            if (payslip == null)

                return NotFound("Payslip not found");

            var fileName = Path.GetFileName(payslip.FilePath);

            var filePath = Path.Combine(

                Directory.GetCurrentDirectory(),

                "wwwroot",

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

    }

}

