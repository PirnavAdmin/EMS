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

        public EmployeeSalaryStructureController(
            IEmployeeSalaryStructureService salaryService)
        {
            _salaryService = salaryService;
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
            var deleted =
                await _salaryService.DeleteAsync(employeeId);

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