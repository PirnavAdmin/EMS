using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Form16Controller : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IForm16Service _form16Service;

        public Form16Controller(
            AppDbContext context,
            IWebHostEnvironment environment,
            IForm16Service form16Service)
        {
            _context = context;
            _environment = environment;
            _form16Service = form16Service;
        }

        [HttpPost("generate/{employeeId}")]
        public async Task<IActionResult> GenerateForm16(
            string employeeId,
            [FromQuery] string financialYear)
        {
            try
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

                if (employee == null)
                    return NotFound("Employee not found.");

                var tds = await _context.EmployeeTDS
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId &&
                        x.FinancialYear == financialYear);

                if (tds == null)
                    return BadRequest("TDS not generated.");

                // Generate PDF
                var pdfPath = await _form16Service.GenerateForm16Async(
                    employeeId,
                    financialYear);

                var existing = await _context.Form16
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId &&
                        x.FinancialYear == financialYear);

                if (existing != null)
                {
                    existing.PdfPath = pdfPath;
                    existing.GeneratedOn = DateTime.Now;
                    existing.GeneratedBy = "Admin";

                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        Message = "Form16 regenerated successfully.",
                        FilePath = existing.PdfPath
                    });
                }

                var form16 = new Form16
                {
                    Employee_Id = employeeId,
                    FinancialYear = financialYear,
                    PdfPath = pdfPath,
                    GeneratedBy = "Admin",
                    GeneratedOn = DateTime.Now
                };

                _context.Form16.Add(form16);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Form16 generated successfully.",
                    FilePath = form16.PdfPath
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetForm16(string employeeId)
        {
            var data = await _context.Form16
                .Where(x => x.Employee_Id == employeeId)
                .OrderByDescending(x => x.GeneratedOn)
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            var form16 = await _context.Form16.FindAsync(id);

            if (form16 == null)
                return NotFound("Form16 not found.");

            var path = Path.Combine(
                _environment.WebRootPath,
                form16.PdfPath.TrimStart('/')
                    .Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!System.IO.File.Exists(path))
                return NotFound("PDF file not found.");

            return PhysicalFile(
                path,
                "application/pdf",
                Path.GetFileName(path));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var form16 = await _context.Form16.FindAsync(id);

            if (form16 == null)
                return NotFound();

            var path = Path.Combine(
                _environment.WebRootPath,
                form16.PdfPath.TrimStart('/')
                    .Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (System.IO.File.Exists(path))
            {
                System.IO.File.Delete(path);
            }

            _context.Form16.Remove(form16);

            await _context.SaveChangesAsync();

            return Ok("Form16 deleted successfully.");
        }
    }
}