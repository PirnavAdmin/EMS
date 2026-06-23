using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

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

        [HttpPost]

        public async Task<IActionResult> Create(EmployeePersonalInfoDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            if (dto == null || string.IsNullOrEmpty(dto.Employee_Id))

                return BadRequest("Invalid data");

            var exists = await _context.EmployeePersonalInfos

                .AnyAsync(e => e.Employee_Id == dto.Employee_Id);

            if (exists)

            {

                return BadRequest(new

                {

                    message = $"Employee Personal Info already exists for ID {dto.Employee_Id}"

                });

            }

            var personalInfo = new EmployeePersonalInfo

            {

                Employee_Id = dto.Employee_Id,

                FirstName = dto.FirstName,

                MiddleName = dto.MiddleName,

                LastName = dto.LastName,

                DateOfBirth = dto.DateOfBirth,

                PhoneNumber = dto.PhoneNumber,

                Email = dto.Email,

                AadhaarNumber = dto.AadhaarNumber,

                PanNumber = dto.PanNumber,

                BloodGroup = dto.BloodGroup,

                CreatedAt = DateTime.UtcNow,

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

            };

            _context.EmployeePersonalInfos.Add(personalInfo);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee Personal Info Created Successfully" });

        }

        // 🔹 UPDATE (FIXED ✅)

        [HttpPut("{employeeId}")]

        public async Task<IActionResult> Update(string employeeId, EmployeePersonalInfoDto dto)

        {

            if (dto == null || string.IsNullOrEmpty(employeeId))

                return BadRequest("Invalid data");

            var existing = await _context.EmployeePersonalInfos

                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (existing == null)

                return NotFound(new { message = "Employee not found" });

            // ✅ Update fields

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

            return Ok(new { message = "Employee updated successfully" });

        }

        // 🔹 GET ALL

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var data = await _context.EmployeePersonalInfos.ToListAsync();

            return Ok(data);

        }

        // 🔹 GET BY EMPLOYEE ID

        [HttpGet("{employeeId}")]

        public async Task<IActionResult> GetByEmployeeId(string employeeId)

        {

            var data = await _context.EmployeePersonalInfos

                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (data == null)

                return NotFound();

            return Ok(data);

        }

        // 🔹 DELETE

        [HttpDelete("{employeeId}")]

        public async Task<IActionResult> Delete(string employeeId)

        {

            var data = await _context.EmployeePersonalInfos

                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (data == null)

                return NotFound();

            _context.EmployeePersonalInfos.Remove(data);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Deleted successfully" });

        }

    }

}
