using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OnboardingExperienceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingExperienceController(AppDbContext context)
        {
            _context = context;
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> AddExperience(OnboardingExperienceDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.OnboardingId))
                return BadRequest("Onboarding Id is required.");

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == dto.OnboardingId);

            if (candidate == null)
                return BadRequest("Invalid Onboarding Id.");

            var experience = new OnboardingExperience
            {
                OnboardingId = dto.OnboardingId,
                CompanyName = dto.CompanyName,
                Designation = dto.Designation,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                YearsOfExperience = dto.YearsOfExperience,
                CreatedAt = DateTime.UtcNow
            };

            await _context.OnboardingExperiences.AddAsync(experience);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience added successfully.",
                data = experience
            });
        }

        // GET BY ONBOARDING ID
        [HttpGet("{onboardingId}")]
        public async Task<IActionResult> GetByOnboardingId(string onboardingId)
        {
            var data = await _context.OnboardingExperiences
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            return Ok(data);
        }

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.OnboardingExperiences
                .OrderBy(x => x.OnboardingId)
                .ToListAsync();

            return Ok(data);
        }

        // UPDATE
        [HttpPut("{onboardingId}")]
        public async Task<IActionResult> Update(string onboardingId, OnboardingExperienceDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var experience = await _context.OnboardingExperiences
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

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
            experience.YearsOfExperience = dto.YearsOfExperience;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience updated successfully.",
                data = experience
            });
        }

        // DELETE
        [HttpDelete("{onboardingId}")]
        public async Task<IActionResult> Delete(string onboardingId)
        {
            var experience = await _context.OnboardingExperiences
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (experience == null)
            {
                return NotFound(new
                {
                    message = "Experience record not found."
                });
            }

            _context.OnboardingExperiences.Remove(experience);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Experience deleted successfully."
            });
        }
    }
}