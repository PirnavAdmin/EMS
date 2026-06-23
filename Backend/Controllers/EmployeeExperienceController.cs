using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        // ✅ POST - Add Experience
        [HttpPost]
        public async Task<IActionResult> AddExperience(EmployeeExperienceDto dto)
        {
            var experience = new EmployeeExperience
            {
                Employee_Id = dto.Employee_Id,
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

            return Ok(new { message = "Experience added successfully"});
        }

        // ✅ PUT - Update
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(string employeeId, EmployeeExperienceDto dto)
        {
            var experience = await _context.EmployeeExperiences
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (experience == null)
                return NotFound("Experience record not found");

            experience.CompanyName = dto.CompanyName;
            experience.Designation = dto.Designation;
            experience.FromDate = dto.FromDate;
            experience.ToDate = dto.ToDate;
            experience.ReasonForLeaving = dto.ReasonForLeaving;
            experience.Description = dto.Description;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience updated successfully",
                
            });
        }

        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(string employeeId)
        {
            var experience = await _context.EmployeeExperiences
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (experience == null)
                return NotFound("Record not found");

            _context.EmployeeExperiences.Remove(experience);
            await _context.SaveChangesAsync();

            return Ok("Deleted successfully");
        }
    }
}
