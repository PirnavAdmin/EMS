using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TDSController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TDSController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("calculate/{employeeId}")]
        public async Task<IActionResult> CalculateTDS(
     string employeeId,
     [FromQuery] string financialYear)
        {
            try
            {
                // ---------------------------------------------------------
                // 1. Validate Employee ID
                // ---------------------------------------------------------
                if (string.IsNullOrWhiteSpace(employeeId))
                {
                    return BadRequest("Employee ID is required.");
                }

                // ---------------------------------------------------------
                // 2. Validate Financial Year
                // Expected format: 2025-2026
                // ---------------------------------------------------------
                if (string.IsNullOrWhiteSpace(financialYear))
                {
                    return BadRequest("Financial year is required.");
                }

                var years = financialYear.Split('-');

                if (years.Length != 2 ||
                    !int.TryParse(years[0], out int startYear) ||
                    !int.TryParse(years[1], out int endYear))
                {
                    return BadRequest(
                        "Invalid financial year format. Use format: 2025-2026.");
                }

                // Validate consecutive years
                if (endYear != startYear + 1)
                {
                    return BadRequest(
                        "Invalid financial year. Example: 2025-2026.");
                }

                // ---------------------------------------------------------
                // 3. Find Approved Tax Declaration
                // ---------------------------------------------------------
                var declaration = await _context.TaxDeclarations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId &&
                        x.FinancialYear == financialYear &&
                        x.Status == "Approved");

                if (declaration == null)
                {
                    return BadRequest(
                        $"Approved Tax Declaration not found for employee " +
                        $"{employeeId} and financial year {financialYear}.");
                }

                // ---------------------------------------------------------
                // 4. Financial Year Months
                //
                // FY 2025-2026:
                // Apr-Dec 2025
                // Jan-Mar 2026
                // ---------------------------------------------------------

                string[] startYearMonths =
                {
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        };

                string[] endYearMonths =
                {
            "January",
            "February",
            "March"
        };

                // ---------------------------------------------------------
                // 5. Fetch Payslips
                // ---------------------------------------------------------
                var payslips = await _context.PaySlips
                    .AsNoTracking()
                    .Where(x =>
                        x.EmployeeId == employeeId &&
                        (
                            (x.Year == startYear &&
                             startYearMonths.Contains(x.Month))
                            ||
                            (x.Year == endYear &&
                             endYearMonths.Contains(x.Month))
                        ))
                    .ToListAsync();

                if (!payslips.Any())
                {
                    return BadRequest(
                        $"No payslips found for employee {employeeId} " +
                        $"for financial year {financialYear}.");
                }

                // ---------------------------------------------------------
                // 6. Calculate Gross Salary
                // ---------------------------------------------------------
                decimal grossSalary = payslips
                    .Sum(x => x.GrossSalary ?? 0);

                // ---------------------------------------------------------
                // 7. Get Approved Tax Declaration Deductions
                // ---------------------------------------------------------
                decimal deductions = await _context.TaxDeclarationItems
                    .Where(x =>
                        x.TaxDeclarationId ==
                        declaration.TaxDeclarationId)
                    .SumAsync(x => x.ApprovedAmount);

                // ---------------------------------------------------------
                // 8. Calculate Taxable Income
                // ---------------------------------------------------------
                decimal taxableIncome =
                    grossSalary - deductions;

                // Don't allow negative taxable income
                if (taxableIncome < 0)
                {
                    taxableIncome = 0;
                }

                // ---------------------------------------------------------
                // 9. Calculate Tax
                // TEMPORARY / DEMO LOGIC
                // Replace with actual tax slab calculation later.
                // ---------------------------------------------------------
                decimal totalTax =
                    taxableIncome * 0.10M;

                // ---------------------------------------------------------
                // 10. Monthly TDS
                // ---------------------------------------------------------
                decimal monthlyTDS =
                    totalTax / 12M;

                // Round amounts
                grossSalary = Math.Round(
                    grossSalary,
                    2,
                    MidpointRounding.AwayFromZero);

                deductions = Math.Round(
                    deductions,
                    2,
                    MidpointRounding.AwayFromZero);

                taxableIncome = Math.Round(
                    taxableIncome,
                    2,
                    MidpointRounding.AwayFromZero);

                totalTax = Math.Round(
                    totalTax,
                    2,
                    MidpointRounding.AwayFromZero);

                monthlyTDS = Math.Round(
                    monthlyTDS,
                    2,
                    MidpointRounding.AwayFromZero);

                // ---------------------------------------------------------
                // 11. Check Existing TDS
                // ---------------------------------------------------------
                var existingTds = await _context.EmployeeTDS
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId &&
                        x.FinancialYear == financialYear);

                // ---------------------------------------------------------
                // 12. Update Existing TDS
                // ---------------------------------------------------------
                if (existingTds != null)
                {
                    existingTds.GrossSalary =
                        grossSalary;

                    existingTds.TaxableIncome =
                        taxableIncome;

                    existingTds.TotalTax =
                        totalTax;

                    existingTds.MonthlyTDS =
                        monthlyTDS;

                    existingTds.GeneratedOn =
                        DateTime.Now;

                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        message = "TDS recalculated successfully.",

                        employeeId = employeeId,

                        financialYear = financialYear,

                        payslipCount = payslips.Count,

                        grossSalary = grossSalary,

                        approvedDeductions = deductions,

                        taxableIncome = taxableIncome,

                        totalTax = totalTax,

                        monthlyTDS = monthlyTDS,

                        tds = existingTds
                    });
                }

                // ---------------------------------------------------------
                // 13. Create New TDS
                // ---------------------------------------------------------
                var tds = new EmployeeTDS
                {
                    Employee_Id = employeeId,

                    FinancialYear = financialYear,

                    GrossSalary = grossSalary,

                    TaxableIncome = taxableIncome,

                    TotalTax = totalTax,

                    MonthlyTDS = monthlyTDS,

                    GeneratedOn = DateTime.Now
                };

                _context.EmployeeTDS.Add(tds);

                await _context.SaveChangesAsync();

                // ---------------------------------------------------------
                // 14. Return Result
                // ---------------------------------------------------------
                return Ok(new
                {
                    message = "TDS calculated successfully.",

                    employeeId = employeeId,

                    financialYear = financialYear,

                    payslipCount = payslips.Count,

                    grossSalary = grossSalary,

                    approvedDeductions = deductions,

                    taxableIncome = taxableIncome,

                    totalTax = totalTax,

                    monthlyTDS = monthlyTDS,

                    tds = tds
                });
            }
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = "An error occurred while calculating TDS.",
                        error = ex.Message,
                        innerError = ex.InnerException?.Message
                    });
            }
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeTDS(string employeeId)
        {
            return Ok(await _context.EmployeeTDS
                .Where(x => x.Employee_Id == employeeId)
                .OrderByDescending(x => x.GeneratedOn)
                .ToListAsync());
        }
    }
}
