using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Interfaces;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CompanyController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ GET: api/company/{id}
        //[Permission(ModuleIds.CompanyDetails, PermissionAction.View)]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCompany(int id)
        {
            var company = await _context.Company.FindAsync(id);

            if (company == null)
                return NotFound(new { message = "Company not found." });

            return Ok(company);
        }

        // ✅ POST: api/company
        //[Permission(ModuleIds.CompanyDetails, PermissionAction.Add)]
        [HttpPost]
        public async Task<IActionResult> CreateCompany([FromBody] UpdateCompanyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var company = new Company
            {
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

            return CreatedAtAction(
                nameof(GetCompany),
                new { id = company.Id },
                new
                {
                    message = "Company created successfully.",
                    data = company
                });
        }

        // ✅ PUT: api/company/{id}
        //[Permission(ModuleIds.CompanyDetails, PermissionAction.Edit)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCompany(int id, [FromBody] UpdateCompanyDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var company = await _context.Company.FindAsync(id);

            if (company == null)
                return NotFound(new { message = "Company not found." });

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