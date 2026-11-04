using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OnboardingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingController(AppDbContext context)
        {
            _context = context;
        }

        private string? GetOnboardingId()
        {
            return User.FindFirst("OnboardingId")?.Value;
        }

        //[HttpPost("add-details")]
        [HttpPost("add-details")]
        public async Task<IActionResult> AddDetails([FromBody] EmployeeFullDetailDTO dto)
        {
            var onboardingId = User.FindFirst("OnboardingId")?.Value;

            if (string.IsNullOrEmpty(onboardingId))
            {
                return Unauthorized("Only onboarding candidates can access this API.");
            }

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (candidate == null)
                return NotFound("Candidate not found.");

            // Save details here

            return Ok("Details saved successfully.");
        }
    }
}

