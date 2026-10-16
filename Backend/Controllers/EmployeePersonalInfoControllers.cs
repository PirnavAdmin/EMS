
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeePersonalInfoController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Confirm this matches the Employees module ID in your database.
        private const int EmployeeModuleId = 47;

        public EmployeePersonalInfoController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================
        // USER CLAIM HELPERS
        // =========================================
        private string? GetEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value;
        }

        private string? GetEmployeeId()
        {
            return User.FindFirst("EmployeeId")?.Value
                ?? User.FindFirst("OnboardingId")?.Value;
        }

        private int? GetRoleId()
        {
            var roleIdValue = User.FindFirst("RoleId")?.Value;

            return int.TryParse(roleIdValue, out var roleId)
                ? roleId
                : null;
        }

        private async Task<bool> IsAdminAsync()
        {
            var email = GetEmail();

            if (string.IsNullOrWhiteSpace(email))
                return false;

            return await _context.Admins
                .AnyAsync(a => a.Email == email);
        }

        // =========================================
        // CHECK PERMISSION
        // Individual UserPermissions override RolePermissions.
        // =========================================
        private async Task<bool> HasPermissionAsync(
            string action)
        {
            if (await IsAdminAsync())
                return true;

            var employeeId = GetEmployeeId();
            var roleId = GetRoleId();

            // Resolve role ID from the employee record if
            // it is not present in the JWT.
            if (roleId == null &&
                !string.IsNullOrWhiteSpace(employeeId))
            {
                var employee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(
                        e => e.Employee_Id == employeeId);

                if (employee != null)
                    roleId = employee.RoleId;
            }

            // First check employee-specific permission.
            if (!string.IsNullOrWhiteSpace(employeeId))
            {
                var userPermission = await _context.UserPermissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p =>
                        p.EmployeeId == employeeId &&
                        p.ModuleId == EmployeeModuleId);

                if (userPermission != null)
                {
                    // An individual permission overrides the role.
                    if (!userPermission.CanAccess)
                        return false;

                    return action switch
                    {
                        "View" => userPermission.CanView,
                        "Add" => userPermission.CanAdd,
                        "Edit" => userPermission.CanEdit,
                        "Delete" => userPermission.CanDelete,
                        _ => false
                    };
                }
            }

            // No individual override: check the role permission.
            if (roleId == null)
                return false;

            var rolePermission = await _context.RolePermissions
                .AsNoTracking()
                .FirstOrDefaultAsync(p =>
                    p.RoleId == roleId.Value &&
                    p.ModuleId == EmployeeModuleId);

            if (rolePermission == null ||
                !rolePermission.CanAccess)
            {
                return false;
            }

            return action switch
            {
                "View" => rolePermission.CanView,
                "Add" => rolePermission.CanAdd,
                "Edit" => rolePermission.CanEdit,
                "Delete" => rolePermission.CanDelete,
                _ => false
            };
        }

        private bool IsOwnRecord(string employeeId)
        {
            var currentId = GetEmployeeId();

            return !string.IsNullOrWhiteSpace(currentId)
                && string.Equals(
                    currentId.Trim(),
                    employeeId.Trim(),
                    StringComparison.OrdinalIgnoreCase);
        }

        // =========================================
        // CREATE
        // POST: api/EmployeePersonalInfo
        // =========================================
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] EmployeePersonalInfoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var email = GetEmail();

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized("Invalid user.");

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Email == email);

            string employeeId;

            if (employee != null)
            {
                // Employee can create only their own record.
                employeeId = employee.Employee_Id;
            }
            else
            {
                // Non-employee users need Add permission.
                if (!await HasPermissionAsync("Add"))
                {
                    return StatusCode(403, new
                    {
                        message =
                            "You do not have permission to add employee personal information."
                    });
                }

                if (string.IsNullOrWhiteSpace(dto.Employee_Id))
                    return BadRequest("Employee Id is required.");

                employeeId = dto.Employee_Id.Trim();
            }

            var exists = await _context.EmployeePersonalInfos
                .AnyAsync(x => x.Employee_Id == employeeId);

            if (exists)
            {
                return BadRequest(new
                {
                    message =
                        $"Personal information already exists for {employeeId}."
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
                message =
                    "Employee Personal Information created successfully."
            });
        }

        // =========================================
        // UPDATE
        // PUT: api/EmployeePersonalInfo/{employeeId}
        // =========================================
        [HttpPut("{employeeId}")]
        public async Task<IActionResult> Update(
            string employeeId,
            [FromBody] EmployeePersonalInfoDto dto)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(employeeId))
                return BadRequest("Employee Id is required.");

            // Employees may edit their own record.
            // Editing another employee requires Edit permission.
            if (!IsOwnRecord(employeeId) &&
                !await HasPermissionAsync("Edit"))
            {
                return StatusCode(403, new
                {
                    message =
                        "You do not have permission to edit this employee's personal information."
                });
            }

            var existing = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(
                    x => x.Employee_Id == employeeId);

            if (existing == null)
            {
                return NotFound(new
                {
                    message =
                        "Employee Personal Information not found."
                });
            }

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
                message =
                    "Employee Personal Information updated successfully."
            });
        }

        // =========================================
        // GET ALL
        // GET: api/EmployeePersonalInfo
        // =========================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!await HasPermissionAsync("View"))
            {
                return StatusCode(403, new
                {
                    message =
                        "You do not have permission to view all employee records."
                });
            }

            var data = await _context.EmployeePersonalInfos
                .OrderBy(x => x.Employee_Id)
                .ToListAsync();

            return Ok(data);
        }

        // =========================================
        // GET BY EMPLOYEE ID
        // GET: api/EmployeePersonalInfo/{employeeId}
        // =========================================
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployeeId(
            string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (!IsOwnRecord(employeeId) &&
                !await HasPermissionAsync("View"))
            {
                return StatusCode(403, new
                {
                    message =
                        "You do not have permission to view this employee's personal information."
                });
            }

            var data = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(
                    x => x.Employee_Id == employeeId);

            if (data == null)
            {
                return NotFound(new
                {
                    message =
                        "Employee Personal Information not found."
                });
            }

            return Ok(data);
        }

        // =========================================
        // DELETE
        // DELETE: api/EmployeePersonalInfo/{employeeId}
        // =========================================
        [HttpDelete("{employeeId}")]
        public async Task<IActionResult> Delete(
            string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();

            if (!await HasPermissionAsync("Delete"))
            {
                return StatusCode(403, new
                {
                    message =
                        "You do not have permission to delete employee personal information."
                });
            }

            var data = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(
                    x => x.Employee_Id == employeeId);

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
