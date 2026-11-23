using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OnboardingEducationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingEducationController(AppDbContext context)
        {
            _context = context;
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(OnboardingEducationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.OnboardingId))
                return BadRequest("Onboarding Id is required.");

            if (!await CurrentUserHelper.CanAccessOnboardingCandidateAsync(_context, User, dto.OnboardingId))
                return NotFound("Invalid Onboarding Id or unauthorized.");

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == dto.OnboardingId);

            if (candidate == null)
                return BadRequest("Invalid Onboarding Id.");

            var education = new OnboardingEducation
            {
                OnboardingId = dto.OnboardingId,
                Qualification = dto.Qualification,
                Institution = dto.Institution,
                University = dto.University,
                YearOfPassing = dto.YearOfPassing,
                Percentage = dto.Percentage,
                CreatedAt = DateTime.UtcNow
            };

            _context.OnboardingEducations.Add(education);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education added successfully.",
                data = education
            });
        }

        // GET BY ONBOARDING ID
        [HttpGet("{onboardingId}")]
        public async Task<IActionResult> GetByOnboardingId(string onboardingId)
        {
            if (!await CurrentUserHelper.CanAccessOnboardingCandidateAsync(_context, User, onboardingId))
                return NotFound("Record not found.");

            var data = await _context.OnboardingEducations
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            return Ok(data);
        }

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var allowedIds = CurrentUserHelper.GetAllowedOnboardingIds(_context, User, orgId);

            var data = await _context.OnboardingEducations
                .Where(x => allowedIds.Contains(x.OnboardingId))
                .OrderBy(x => x.OnboardingId)
                .ToListAsync();

            return Ok(data);
        }

        // UPDATE ALL (Replace Existing Records)
        [HttpPut("{onboardingId}")]
        public async Task<IActionResult> UpdateAll(string onboardingId, List<OnboardingEducationDto> dtos)
        {
            if (dtos == null || dtos.Count == 0)
                return BadRequest("No education data provided.");

            if (!await CurrentUserHelper.CanAccessOnboardingCandidateAsync(_context, User, onboardingId))
                return NotFound("Invalid Onboarding Id or unauthorized.");

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (candidate == null)
                return BadRequest("Invalid Onboarding Id.");

            var existing = await _context.OnboardingEducations
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            _context.OnboardingEducations.RemoveRange(existing);

            var newList = dtos.Select(dto => new OnboardingEducation
            {
                OnboardingId = onboardingId,
                Qualification = dto.Qualification,
                Institution = dto.Institution,
                University = dto.University,
                YearOfPassing = dto.YearOfPassing,
                Percentage = dto.Percentage,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await _context.OnboardingEducations.AddRangeAsync(newList);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education details updated successfully.",
                data = newList
            });
        }

        // DELETE ALL BY ONBOARDING ID
        [HttpDelete("{onboardingId}")]
        public async Task<IActionResult> Delete(string onboardingId)
        {
            if (!await CurrentUserHelper.CanAccessOnboardingCandidateAsync(_context, User, onboardingId))
                return NotFound("Record not found.");

            var records = await _context.OnboardingEducations
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            if (!records.Any())
            {
                return NotFound(new
                {
                    message = "No education records found."
                });
            }

            _context.OnboardingEducations.RemoveRange(records);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Education records deleted successfully."
            });
        }
    }
}
