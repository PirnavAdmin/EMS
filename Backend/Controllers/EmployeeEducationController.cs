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

        // ✅ CREATE (Add single education)

        [HttpPost]

        public async Task<IActionResult> Create(EmployeeEducationDto dto)

        {

            var employeeExists = await _context.Employees

                .AnyAsync(e => e.Employee_Id == dto.Employee_Id);

            if (!employeeExists)

                return BadRequest("Employee does not exist.");

            var education = new EmployeeEducation

            {

                Employee_Id = dto.Employee_Id,

                Degree = dto.Degree,

                UniversityBoard = dto.UniversityBoard,

                YearOfPassing = dto.YearOfPassing,

                PercentageCGPA = dto.PercentageCGPA,

                Specialization = dto.Specialization,

                CreatedAt = DateTime.UtcNow

            };

            await _context.EmployeeEducations.AddAsync(education);

            await _context.SaveChangesAsync();

            return Ok(education);

        }

        // ✅ GET BY EMPLOYEE ID (IMPORTANT)

        [HttpGet("{employeeId}")]

        public async Task<IActionResult> GetByEmployee(string employeeId)

        {

            var data = await _context.EmployeeEducations

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            return Ok(data);

        }

        // ✅ UPDATE ALL (REPLACE LIST)

        [HttpPut("{employeeId}")]

        public async Task<IActionResult> UpdateAll(string employeeId, List<EmployeeEducationDto> dtos)

        {

            if (dtos == null || dtos.Count == 0)

                return BadRequest("No data provided");

            var existing = await _context.EmployeeEducations

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            // 🔥 Remove old records

            _context.EmployeeEducations.RemoveRange(existing);

            // 🔥 Add new records

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

                message = "Education updated successfully",

                data = newList

            });

        }

        // ✅ DELETE ALL BY EMPLOYEE

        [HttpDelete("{employeeId}")]

        public async Task<IActionResult> Delete(string employeeId)

        {

            var records = await _context.EmployeeEducations

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            if (!records.Any())

                return NotFound("No records found");

            _context.EmployeeEducations.RemoveRange(records);

            await _context.SaveChangesAsync();

            return Ok("All education records deleted");

        }

    }

}
