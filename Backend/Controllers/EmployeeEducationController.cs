using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

        private async Task<bool> IsAdminUser()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrWhiteSpace(email))
                return false;

            return await _context.Admins
                .AnyAsync(a => a.Email == email);
        }

        // ✅ CREATE (Add single education)

        [HttpPost]
        public async Task<IActionResult> Create(EmployeeEducationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool isAdmin = await IsAdminUser();

            string employeeId;

            if (isAdmin)
            {
                if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                    return BadRequest("Employee Id is required.");

                employeeId = dto.Employee_Id;
            }
            else
            {
                employeeId = User.FindFirst("EmployeeId")?.Value
                          ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(employeeId))
                    return Unauthorized("Invalid user.");

                dto.Employee_Id = employeeId;
            }

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



        // ✅ GET BY EMPLOYEE ID (IMPORTANT)

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (currentId != employeeId)
                    return Forbid("You can view only your own education details.");
            }

            var data = await _context.EmployeeEducations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            return Ok(data);
        }


        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
                return Forbid("Only administrators can view all education records.");

            var data = await _context.EmployeeEducations
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }
        // ✅ UPDATE ALL (REPLACE LIST)
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> UpdateAll(string employeeId, List<EmployeeEducationDto> dtos)
        {
            if (dtos == null || dtos.Count == 0)
                return BadRequest("No education data provided.");

            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, employeeId, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can edit only your own education details.");
                }
            }

            var existing = await _context.EmployeeEducations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            _context.EmployeeEducations.RemoveRange(existing);

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

        // ✅ DELETE ALL BY EMPLOYEE

        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(string employeeId)
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, employeeId, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can delete only your own education details.");
                }
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
