using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.Security.Claims;

using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Controllers

{

    [Authorize]

    [ApiController]

    [Route("api/[controller]")]

    public class EmployeeFullDetailController : ControllerBase

    {

        private readonly AppDbContext _context;

        public EmployeeFullDetailController(AppDbContext context)

        {

            _context = context;

        }

        // 🔹 Helper Method to Extract EmployeeId from JWT Token

        private string GetEmployeeId()

        {

            return User.FindFirst("EmployeeId")?.Value

                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        }

        // 🔹 GET: api/EmployeeFullDetail/my-details

        [HttpGet("my-details")]

        public async Task<IActionResult> GetMyDetails()

        {

            var employeeId = GetEmployeeId();

            if (string.IsNullOrEmpty(employeeId))

                return Unauthorized(new { message = "Invalid or missing token." });

            var employee = await _context.Employees

                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)

                return NotFound(new { message = "Employee does not exist." });

            var personalInfo = await _context.EmployeePersonalInfos

                .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

            var bankDetails = await _context.EmployeeBankDetails

                .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

            var education = await _context.EmployeeEducations

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            var experience = await _context.EmployeeExperiences

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            return Ok(new

            {

                employee,

                personalInfo,

                bankDetails,

                education,

                experience

            });

        }

        // 🔹 PUT: api/EmployeeFullDetail/my-details

        [HttpPut("my-details")]

        public async Task<IActionResult> UpdateMyDetails([FromBody] EmployeeFullDetailDTO dto)

        {

            var employeeId = GetEmployeeId();

            if (string.IsNullOrEmpty(employeeId))

                return Unauthorized(new { message = "Invalid or missing token." });

            if (dto == null)

                return BadRequest(new { message = "Invalid request data." });

            using var transaction = await _context.Database.BeginTransactionAsync();

            try

            {

                // 🔹 Employee

                var employee = await _context.Employees

                    .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

                if (employee == null)

                    return NotFound(new { message = "Employee does not exist." });

                if (dto.Employee != null)

                {

                    employee.Name = dto.Employee.Name;

                    employee.Email = dto.Employee.Email;

                }

                // 🔹 Personal Info (SAFE UPSERT)

                if (dto.PersonalInfo != null)

                {

                    var personalInfo = await _context.EmployeePersonalInfos

                        .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

                    if (personalInfo == null)

                    {

                        personalInfo = new EmployeePersonalInfo

                        {

                            Employee_Id = employeeId

                        };

                        _context.EmployeePersonalInfos.Add(personalInfo);

                    }

                    // Always update fields

                    personalInfo.Location = dto.PersonalInfo.Location;

                    personalInfo.DateOfBirth = dto.PersonalInfo.DateOfBirth;

                }

                // 🔹 Bank Details (SAFE UPSERT)

                if (dto.BankDetails != null)

                {

                    var bankDetails = await _context.EmployeeBankDetails

                        .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

                    if (bankDetails == null)

                    {

                        bankDetails = new EmployeeBankDetail

                        {

                            Employee_Id = employeeId

                        };

                        _context.EmployeeBankDetails.Add(bankDetails);

                    }

                    // Always update

                    bankDetails.Account_Number = dto.BankDetails.Account_Number;

                    bankDetails.IFSC_Code = dto.BankDetails.IFSC_Code;

                }

                // 🔹 Education (Replace)

                var existingEducation = await _context.EmployeeEducations

                    .Where(e => e.Employee_Id == employeeId)

                    .ToListAsync();

                if (existingEducation.Any())

                    _context.EmployeeEducations.RemoveRange(existingEducation);

                if (dto.Educations != null && dto.Educations.Any())

                {

                    foreach (var edu in dto.Educations)

                    {

                        edu.Employee_Id = employeeId;

                        _context.EmployeeEducations.Add(edu);

                    }

                }

                // 🔹 Experience (Replace)

                var existingExperience = await _context.EmployeeExperiences

                    .Where(e => e.Employee_Id == employeeId)

                    .ToListAsync();

                if (existingExperience.Any())

                    _context.EmployeeExperiences.RemoveRange(existingExperience);

                if (dto.Experiences != null && dto.Experiences.Any())

                {

                    foreach (var exp in dto.Experiences)

                    {

                        exp.Employee_Id = employeeId;

                        _context.EmployeeExperiences.Add(exp);

                    }

                }

                // ✅ Save everything

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(new { message = "Your details updated successfully." });

            }

            catch (Exception ex)

            {

                await transaction.RollbackAsync();

                return StatusCode(500, new

                {

                    message = "Error updating details",

                    error = ex.Message

                });

            }

        }


        [HttpGet("{employeeId}")]

        public async Task<IActionResult> GetEmployeeFullDetails(string employeeId)

        {

            var employee = await _context.Employees

                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            var personalInfo = await _context.EmployeePersonalInfos

                .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

            var bankDetails = await _context.EmployeeBankDetails

                .FirstOrDefaultAsync(b => b.Employee_Id == employeeId);

            var education = await _context.EmployeeEducations

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            var experience = await _context.EmployeeExperiences

                .Where(e => e.Employee_Id == employeeId)

                .ToListAsync();

            return Ok(new

            {

                employee,

                personalInfo,

                bankDetails,

                education,

                experience

            });

        }

    }

}

