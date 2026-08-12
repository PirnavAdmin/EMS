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
    public class EmployeeExperienceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeeExperienceController(AppDbContext context)
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
        // ✅ POST - Add Experience
        [HttpPost]
        public async Task<IActionResult> AddExperience(EmployeeExperienceDto dto)
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

            var experience = new EmployeeExperience
            {
                Employee_Id = employeeId,
                CompanyName = dto.CompanyName,
                Designation = dto.Designation,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                ReasonForLeaving = dto.ReasonForLeaving,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            await _context.EmployeeExperiences.AddAsync(experience);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience added successfully."
            });
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (currentId != employeeId)
                    return Forbid("You can view only your own experience details.");
            }

            var data = await _context.EmployeeExperiences
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
                return Forbid("Only administrators can view all experience records.");

            var data = await _context.EmployeeExperiences
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }

        // ✅ PUT - Update
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(string employeeId, EmployeeExperienceDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, employeeId, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can edit only your own experience.");
                }
            }

            var experience = await _context.EmployeeExperiences
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (experience == null)
            {
                return NotFound(new
                {
                    message = "Experience record not found."
                });
            }

            experience.CompanyName = dto.CompanyName;
            experience.Designation = dto.Designation;
            experience.FromDate = dto.FromDate;
            experience.ToDate = dto.ToDate;
            experience.ReasonForLeaving = dto.ReasonForLeaving;
            experience.Description = dto.Description;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience updated successfully.",
                data = experience
            });
        }

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
                    return Forbid("You can delete only your own experience.");
                }
            }

            var experience = await _context.EmployeeExperiences
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (experience == null)
            {
                return NotFound(new
                {
                    message = "Experience record not found."
                });
            }

            _context.EmployeeExperiences.Remove(experience);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience deleted successfully."
            });
        }
    }
}
