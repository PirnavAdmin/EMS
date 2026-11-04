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

        // =========================================================
        // POST - Add Experience
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> AddExperience(EmployeeExperienceDto dto)
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
                message = "Experience added successfully.",
                data = experience
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

            var data = await _context.EmployeeExperiences
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
            var data = await _context.EmployeeExperiences
                .AsNoTracking()
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }


        // =========================================================
        // PUT - Update Experience
        // =========================================================
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(
            string employeeId,
            EmployeeExperienceDto dto)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return BadRequest(new
                {
                    message = "Employee Id is required."
                });
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


        // =========================================================
        // DELETE - Delete Experience
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