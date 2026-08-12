using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OnboardingPersonalInfoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingPersonalInfoController(AppDbContext context)
        {
            _context = context;
        }

        // CREATE
        [HttpPost]
        public async Task<IActionResult> Create(OnboardingPersonalInfoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.OnboardingId))
                return BadRequest("Onboarding Id is required.");

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == dto.OnboardingId);

            if (candidate == null)
                return BadRequest("Invalid Onboarding Id.");

            var exists = await _context.OnboardingPersonalInfos
                .AnyAsync(x => x.OnboardingId == dto.OnboardingId);

            if (exists)
                return BadRequest("Personal information already exists.");

            var personalInfo = new OnboardingPersonalInfo
            {
                OnboardingId = dto.OnboardingId,
                FirstName = dto.FirstName,
                MiddleName = dto.MiddleName,
                LastName = dto.LastName,
                DateOfBirth = dto.DateOfBirth,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                AadhaarNumber = dto.AadhaarNumber,
                PanNumber = dto.PanNumber,
                BloodGroup = dto.BloodGroup,
                Marital_Status = dto.Marital_Status,
                Gender = dto.Gender,
                JoiningDate = dto.JoiningDate,
                Location = dto.Location,
                WorkExperience = dto.WorkExperience,
                Department = dto.Department,
                Designation = dto.Designation,
                HouseNo = dto.HouseNo,
                Street = dto.Street,
                City = dto.City,
                District = dto.District,
                State = dto.State,
                Country = dto.Country,
                Pincode = dto.Pincode,
                CreatedAt = DateTime.UtcNow
            };

            _context.OnboardingPersonalInfos.Add(personalInfo);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Onboarding Personal Information created successfully."
            });
        }

        // UPDATE
        [HttpPut("{onboardingId}")]
        public async Task<IActionResult> Update(string onboardingId, OnboardingPersonalInfoDto dto)
        {
            var existing = await _context.OnboardingPersonalInfos
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (existing == null)
                return NotFound("Record not found.");

            existing.FirstName = dto.FirstName;
            existing.MiddleName = dto.MiddleName;
            existing.LastName = dto.LastName;
            existing.DateOfBirth = dto.DateOfBirth;
            existing.PhoneNumber = dto.PhoneNumber;
            existing.Email = dto.Email;
            existing.AadhaarNumber = dto.AadhaarNumber;
            existing.PanNumber = dto.PanNumber;
            existing.BloodGroup = dto.BloodGroup;
            existing.Marital_Status = dto.Marital_Status;
            existing.Gender = dto.Gender;
            existing.JoiningDate = dto.JoiningDate;
            existing.Location = dto.Location;
            existing.WorkExperience = dto.WorkExperience;
            existing.Department = dto.Department;
            existing.Designation = dto.Designation;
            existing.HouseNo = dto.HouseNo;
            existing.Street = dto.Street;
            existing.City = dto.City;
            existing.District = dto.District;
            existing.State = dto.State;
            existing.Country = dto.Country;
            existing.Pincode = dto.Pincode;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Updated successfully."
            });
        }

        // GET ALL
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _context.OnboardingPersonalInfos
                .OrderBy(x => x.OnboardingId)
                .ToListAsync();

            return Ok(data);
        }

        // GET BY ONBOARDING ID
        [HttpGet("{onboardingId}")]
        public async Task<IActionResult> GetByOnboardingId(string onboardingId)
        {
            var data = await _context.OnboardingPersonalInfos
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (data == null)
                return NotFound("Record not found.");

            return Ok(data);
        }

        // DELETE
        [HttpDelete("{onboardingId}")]
        public async Task<IActionResult> Delete(string onboardingId)
        {
            var data = await _context.OnboardingPersonalInfos
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId);

            if (data == null)
                return NotFound("Record not found.");

            _context.OnboardingPersonalInfos.Remove(data);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Deleted successfully."
            });
        }
    }
}