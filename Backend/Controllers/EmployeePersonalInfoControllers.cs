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

    public class EmployeePersonalInfoController : ControllerBase

    {

        private readonly AppDbContext _context;

        public EmployeePersonalInfoController(AppDbContext context)

        {

            _context = context;

        }

        // 🔹 CREATE
        //private async Task<bool> IsAdminUser()
        //{
        //    var email = User.FindFirst(ClaimTypes.Email)?.Value;

        //    if (string.IsNullOrEmpty(email))
        //        return false;

        //    return await _context.Admins
        //        .AnyAsync(a => a.Email == email);
        //}



        [HttpPost]
        public async Task<IActionResult> Create(EmployeePersonalInfoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Get logged-in user's email from JWT
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized("Invalid user.");

            // Fetch EmployeeId from Employees table
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Email == email);

            string employeeId;

            if (employee != null)
            {
                // Logged-in employee
                employeeId = employee.Employee_Id;

                // Ignore Employee_Id sent from frontend
                dto.Employee_Id = employee.Employee_Id;
            }
            else
            {
                // Admin / HR / Manager
                if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                    return BadRequest("Employee Id is required.");

                employeeId = dto.Employee_Id;
            }
            var exists = await _context.EmployeePersonalInfos
                .AnyAsync(x => x.Employee_Id == employeeId);

            if (exists)
            {
                return BadRequest(new
                {
                    message = $"Personal information already exists for {employeeId}."
                });
            }

            var personalInfo = new EmployeePersonalInfo
            {
                Employee_Id = employeeId,
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
                Department = dto.Department,
                Designation = dto.Designation,
                Gender = dto.Gender,
                WorkExperience = dto.WorkExperience,
                Location = dto.Location,
                HouseNo = dto.HouseNo,
                Street = dto.Street,
                City = dto.City,
                District = dto.District,
                State = dto.State,
                Country = dto.Country,
                Pincode = dto.Pincode,
                JoiningDate = dto.JoiningDate,
                CreatedAt = DateTime.UtcNow
            };

            _context.EmployeePersonalInfos.Add(personalInfo);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Employee Personal Information created successfully."
            });
        }
        // 🔹 UPDATE (FIXED ✅)
        [HttpPut("{*employeeId}")]
        public async Task<IActionResult> Update(string employeeId, EmployeePersonalInfoDto dto)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(employeeId))
                return BadRequest("Employee Id is required.");

            // Check if logged-in user is Admin
            var currentUserId = User.FindFirst("EmployeeId")?.Value
                  ?? User.FindFirst("OnboardingId")?.Value;

            // Employee can edit only their own details
            if (!string.IsNullOrWhiteSpace(currentUserId))
            {
                if (!string.Equals(currentUserId, employeeId, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can edit only your own information.");
                }
            }

            // If EmployeeId is not present in JWT,
            // this request is coming from Admin / HR / Manager / Permission user,
            // so allow the update.

            var existing = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (existing == null)
            {
                return NotFound(new
                {
                    message = "Employee Personal Information not found."
                });
            }

            // Update fields
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
            existing.Department = dto.Department;
            existing.Designation = dto.Designation;
            existing.Gender = dto.Gender;
            existing.WorkExperience = dto.WorkExperience;
            existing.Location = dto.Location;
            existing.HouseNo = dto.HouseNo;
            existing.Street = dto.Street;
            existing.City = dto.City;
            existing.District = dto.District;
            existing.State = dto.State;
            existing.Country = dto.Country;
            existing.Pincode = dto.Pincode;
            existing.JoiningDate = dto.JoiningDate;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Employee Personal Information updated successfully."
            });
        }

        // 🔹 GET ALL

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var loggedInEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            bool isAdmin = await _context.Admins
                .AnyAsync(a => a.Email == loggedInEmail);

            if (!isAdmin)
            {
                return Forbid("Only administrators can view all employee records.");
            }

            var data = await _context.EmployeePersonalInfos
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }

        // 🔹 GET BY EMPLOYEE ID

        [HttpGet("{*employeeId}")]
        public async Task<IActionResult> GetByEmployeeId(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            var loggedInEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            bool isAdmin = await _context.Admins
                .AnyAsync(a => a.Email == loggedInEmail);

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (currentId != employeeId)
                {
                    return Forbid("You can view only your own personal information.");
                }
            }

            var data = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (data == null)
            {
                return NotFound(new
                {
                    message = "Employee Personal Information not found."
                });
            }

            return Ok(data);
        }

        // 🔹 DELETE

        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(string employeeId)
        {
            var loggedInEmail = User.FindFirst(ClaimTypes.Email)?.Value;

            bool isAdmin = await _context.Admins
                .AnyAsync(a => a.Email == loggedInEmail);

            if (!isAdmin)
            {
                return Forbid("Only administrators can delete employee personal information.");
            }

            var data = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (data == null)
                return NotFound();

            _context.EmployeePersonalInfos.Remove(data);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Deleted successfully."
            });
        }
    }

}
