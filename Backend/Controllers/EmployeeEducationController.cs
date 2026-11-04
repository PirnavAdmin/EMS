using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeEducationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeeEducationController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // CREATE - Add single education
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> Create(EmployeeEducationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Employee_Id))
            {
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });
            }

            string employeeId = dto.Employee_Id.Trim();

            var education = new EmployeeEducation
            {
                Employee_Id = employeeId,
                Degree = dto.Degree,
                UniversityBoard = dto.UniversityBoard,
                YearOfPassing = dto.YearOfPassing,
                PercentageCGPA = dto.PercentageCGPA,
                Specialization = dto.Specialization,
                CreatedAt = DateTime.UtcNow
            };

            _context.EmployeeEducations.Add(education);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education added successfully.",
                data = education
            });
        }


        // =========================================================
        // GET BY EMPLOYEE ID
        // =========================================================
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });
            }

            var data = await _context.EmployeeEducations
                .AsNoTracking()
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            return Ok(data);
        }


        // =========================================================
        // GET ALL
        // =========================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.EmployeeEducations
                .AsNoTracking()
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }


        // =========================================================
        // UPDATE ALL EDUCATION RECORDS FOR EMPLOYEE
        // =========================================================
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> UpdateAll(
            string employeeId,
            List<EmployeeEducationDto> dtos)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });
            }

            if (dtos == null || dtos.Count == 0)
            {
                return BadRequest(new
                {
                    message = "No education data provided."
                });
            }

            var existing = await _context.EmployeeEducations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            // Remove old education records
            if (existing.Any())
            {
                _context.EmployeeEducations.RemoveRange(existing);
            }

            // Create new education records
            var newList = dtos.Select(dto => new EmployeeEducation
            {
                Employee_Id = employeeId,
                Degree = dto.Degree,
                UniversityBoard = dto.UniversityBoard,
                YearOfPassing = dto.YearOfPassing,
                PercentageCGPA = dto.PercentageCGPA,
                Specialization = dto.Specialization,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await _context.EmployeeEducations.AddRangeAsync(newList);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education details updated successfully.",
                data = newList
            });
        }


        // =========================================================
        // DELETE ALL EDUCATION RECORDS BY EMPLOYEE
        // =========================================================
        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });
            }

            var records = await _context.EmployeeEducations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            if (!records.Any())
            {
                return NotFound(new
                {
                    message = "No education records found."
                });
            }

            _context.EmployeeEducations.RemoveRange(records);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education records deleted successfully."
            });
        }
    }
}