using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CompanyController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ GET: api/company (Current Tenant Company)
        [HttpGet]
        public async Task<IActionResult> GetCurrentCompany()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.Company.AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                var company = await query.FirstOrDefaultAsync(c => c.OrganizationId == orgId.Value);
                if (company != null)
                    return Ok(company);

                // Return 404 when the organization has no company profile yet
                return NotFound(new { message = "Company profile has not been created yet for this organization." });
            }

            var defaultCompany = await query.FirstOrDefaultAsync();
            if (defaultCompany == null)
                return NotFound(new { message = "Company not found." });

            return Ok(defaultCompany);
        }

        // ✅ GET: api/company/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetCompany(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            if (orgId.HasValue && orgId.Value > 0)
            {
                // Prioritize the tenant's own company profile
                var tenantCompany = await _context.Company
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.OrganizationId == orgId.Value);

                if (tenantCompany != null)
                    return Ok(tenantCompany);

                // If not created yet, return 404 so frontend can display empty form cleanly
                return NotFound(new { message = "Company profile has not been created yet for this organization." });
            }

            var company = await _context.Company.FindAsync(id);
            if (company == null)
                return NotFound(new { message = "Company not found." });

            return Ok(company);
        }

        // ✅ POST: api/company
        [HttpPost]
        public async Task<IActionResult> CreateCompany([FromBody] UpdateCompanyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            if (orgId.HasValue && orgId.Value > 0)
            {
                var existing = await _context.Company.FirstOrDefaultAsync(c => c.OrganizationId == orgId.Value);
                if (existing != null)
                {
                    existing.CompanyName = dto.CompanyName;
                    existing.EstablishedDate = dto.EstablishedDate;
                    existing.PhoneNumber = dto.PhoneNumber;
                    existing.EmailAddress = dto.EmailAddress;
                    existing.GSTNumber = dto.GSTNumber;
                    existing.TINNumber = dto.TINNumber;
                    existing.PANNumber = dto.PANNumber;
                    existing.TotalBranches = dto.TotalBranches;
                    existing.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        message = "Company details updated successfully.",
                        data = existing
                    });
                }
            }

            var company = new Company
            {
                OrganizationId = orgId,
                CompanyName = dto.CompanyName,
                EstablishedDate = dto.EstablishedDate,
                PhoneNumber = dto.PhoneNumber,
                EmailAddress = dto.EmailAddress,
                GSTNumber = dto.GSTNumber,
                TINNumber = dto.TINNumber,
                PANNumber = dto.PANNumber,
                TotalBranches = dto.TotalBranches,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Company.Add(company);
            await _context.SaveChangesAsync();

            return StatusCode(StatusCodes.Status201Created, new
            {
                message = "Company created successfully.",
                data = company
            });
        }

        // ✅ PUT: api/company or api/company/{id}
        [HttpPut]
        [HttpPut("{id:int?}")]
        public async Task<IActionResult> UpdateCompany([FromRoute] int? id, [FromBody] UpdateCompanyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            Company? company = null;
            if (orgId.HasValue && orgId.Value > 0)
            {
                company = await _context.Company.FirstOrDefaultAsync(c => c.OrganizationId == orgId.Value);
            }

            if (company == null && (!orgId.HasValue || orgId.Value <= 0) && id.HasValue && id.Value > 0)
            {
                company = await _context.Company.FindAsync(id.Value);
            }

            // Upsert: If company doesn't exist for this organization yet, create it
            if (company == null)
            {
                if (orgId.HasValue && orgId.Value > 0)
                {
                    company = new Company
                    {
                        OrganizationId = orgId.Value
                    };
                    _context.Company.Add(company);
                }
                else
                {
                    return NotFound(new { message = "Company not found." });
                }
            }

            if (orgId.HasValue && company.OrganizationId.HasValue && company.OrganizationId.Value != orgId.Value)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You do not have permission to modify a company profile belonging to another organization." });

            company.CompanyName = dto.CompanyName;
            company.EstablishedDate = dto.EstablishedDate;
            company.PhoneNumber = dto.PhoneNumber;
            company.EmailAddress = dto.EmailAddress;
            company.GSTNumber = dto.GSTNumber;
            company.TINNumber = dto.TINNumber;
            company.PANNumber = dto.PANNumber;
            company.TotalBranches = dto.TotalBranches;
            company.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Company details updated successfully.",
                data = company
            });
        }
    }
}
