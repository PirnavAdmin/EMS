using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeSalaryStructureController : ControllerBase
    {
        private readonly IEmployeeSalaryStructureService _salaryService;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public EmployeeSalaryStructureController(
            IEmployeeSalaryStructureService salaryService,
            IAuditLogService auditLogService) // varsha
        {
            _salaryService = salaryService;
            _auditLogService = auditLogService; // varsha
        }

        // ==========================================
        // CREATE
        // ==========================================

        [HttpPost]
        public async Task<IActionResult> Create(
            EmployeeSalaryStructureDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result =
                    await _salaryService.CreateAsync(dto);

                // varsha - Audit salary creation (non-sensitive fields only)
                await _auditLogService.LogCreateAsync(
                    module: "Payroll",
                    entityName: "EmployeeSalaryStructure",
                    entityId: dto.Employee_Id ?? "N/A",
                    description: $"Created salary structure for employee {dto.Employee_Id}",
                    newValues: new { dto.Employee_Id, dto.AnnualCTC, dto.BasicSalary, dto.EffectiveFrom },
                    user: User);

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
        public async Task<IActionResult> GetByEmployee(
            string employeeId)
        {
            var data =
                await _salaryService
                    .GetByEmployeeIdAsync(employeeId);

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
            var data =
                await _salaryService.GetAllAsync();

            return Ok(data);
        }

        // ==========================================
        // UPDATE
        // ==========================================

        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(
            string employeeId,
            EmployeeSalaryStructureDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // varsha - Fetch existing salary structure before update
            var existing = await _salaryService.GetByEmployeeIdAsync(employeeId);
            var oldValues = existing != null ? new
            {
                EmployeeId = employeeId,
                existing.AnnualCTC,
                existing.BasicSalary,
                existing.EffectiveFrom
            } : null;

            var result =
                await _salaryService.UpdateAsync(
                    employeeId,
                    dto);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Salary structure not found."
                });
            }

            // varsha - Audit salary update with full old and new values delta
            await _auditLogService.LogUpdateAsync(
                module: "Payroll",
                entityName: "EmployeeSalaryStructure",
                entityId: employeeId,
                description: $"Updated salary structure for employee {employeeId}",
                oldValues: oldValues,
                newValues: new { EmployeeId = employeeId, dto.AnnualCTC, dto.BasicSalary, dto.EffectiveFrom },
                user: User);

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
        public async Task<IActionResult> Delete(
            string employeeId)
        {
            // varsha - Capture existing salary structure before deletion
            var existing = await _salaryService.GetByEmployeeIdAsync(employeeId);
            var oldValues = existing != null ? new
            {
                EmployeeId = employeeId,
                existing.AnnualCTC,
                existing.BasicSalary,
                existing.EffectiveFrom
            } : null;

            var deleted =
                await _salaryService.DeleteAsync(employeeId);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Salary structure not found."
                });
            }

            // varsha - Audit salary deletion with pre-delete state preserved
            await _auditLogService.LogDeleteAsync(
                module: "Payroll",
                entityName: "EmployeeSalaryStructure",
                entityId: employeeId,
                description: $"Deleted salary structure for employee {employeeId}",
                oldValues: oldValues,
                user: User);

            return Ok(new
            {
                message = "Salary structure deleted successfully."
            });
        }
    }
}