using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeSalaryStructureController : ControllerBase
    {
        private readonly IEmployeeSalaryStructureService _salaryService;
        private readonly AppDbContext _context;

        public EmployeeSalaryStructureController(
            IEmployeeSalaryStructureService salaryService,
            AppDbContext context)
        {
            _salaryService = salaryService;
            _context = context;
        }

        // ==========================================
        // CREATE
        // ==========================================

        [HttpPost]
        public async Task<IActionResult> Create(EmployeeSalaryStructureDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, dto.Employee_Id);
            if (!inTenant)
                return NotFound(new { message = "Employee not found in your organization." });

            try
            {
                var result = await _salaryService.CreateAsync(dto);

                return Ok(new
                {
                    message = "Salary structure added successfully.",
                    data = result
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

        // ==========================================
        // GET BY EMPLOYEE ID
        // ==========================================

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
            if (!inTenant)
            {
                return NotFound(new { message = "Salary structure not found in your organization." });
            }

            var data = await _salaryService.GetByEmployeeIdAsync(employeeId);

            if (data == null)
            {
                return NotFound(new
                {
                    message = "Salary structure not found."
                });
            }

            return Ok(data);
        }

        // ==========================================
        // GET ALL
        // ==========================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                .Select(e => e.Employee_Id)
                .ToListAsync();

            var data = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x => tenantEmpIds.Contains(x.Employee_Id))
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }

        // ==========================================
        // UPDATE
        // ==========================================

        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(string employeeId, EmployeeSalaryStructureDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
            if (!inTenant)
                return NotFound(new { message = "Salary structure not found in your organization." });

            var result = await _salaryService.UpdateAsync(employeeId, dto);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                message = "Salary structure updated successfully.",
                data = result
            });
        }

        // ==========================================
        // DELETE
        // ==========================================

        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
            if (!inTenant)
                return NotFound(new { message = "Salary structure not found in your organization." });

            var deleted = await _salaryService.DeleteAsync(employeeId);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Salary structure not found."
                });
            }

            return Ok(new
            {
                message = "Salary structure deleted successfully."
            });
        }
    }
}