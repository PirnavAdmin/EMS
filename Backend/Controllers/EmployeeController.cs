using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Services;

using Microsoft.AspNetCore.Mvc;

using EmployeeManagementSystem.Data;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    public class EmployeesController : ControllerBase

    {

        private readonly IEmployeeService _employeeService;

        private readonly AppDbContext _context;


        public EmployeesController(

     IEmployeeService employeeService,

     AppDbContext context)

        {

            _employeeService = employeeService;

            _context = context;

        }

        // ADD EMPLOYEE

        [HttpPost]

        public async Task<IActionResult> AddEmployee(EmployeeDto dto)

        {

            var result = await _employeeService.AddEmployee(dto);

            return Ok(new

            {

                message = "Employee added successfully",

                data = result

            });

        }

        // GET ALL EMPLOYEES

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var employees = await _employeeService.GetAllEmployees();

            return Ok(employees);

        }

        // UPDATE EMPLOYEE

        [HttpPut("{employeeId}")]

        public async Task<IActionResult> UpdateEmployee(string employeeId, EmployeeDto dto)

        {

            var employee = await _employeeService.UpdateEmployee(employeeId, dto);

            if (employee == null)

                return NotFound("Employee not found");

            return Ok(employee);

        }

        // DELETE EMPLOYEE

        [HttpDelete("{employeeId}")]

        public async Task<IActionResult> Delete(string employeeId)

        {

            var result = await _employeeService.DeleteEmployee(employeeId);

            if (result == "Employee not found")

                return NotFound(result);

            return Ok(result);

        }

        [HttpPost("change-password")]

        public async Task<IActionResult> ChangePassword(UserChangePasswordDto dto)

        {

            try

            {

                var user = await _context.Users

     .FirstOrDefaultAsync(u =>

         u.Email.Trim().ToLower() ==

         dto.Email.Trim().ToLower());

                Console.WriteLine("DTO EMAIL: " + dto.Email);

                if (user == null)

                {

                    return NotFound("User not found");

                }

                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(

                    dto.OldPassword,

                    user.Password);

                if (!isPasswordValid)

                {

                    return BadRequest("Old password is incorrect");

                }

                if (dto.NewPassword != dto.ConfirmPassword)

                {

                    return BadRequest("Passwords do not match");

                }

                user.Password = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

                await _context.SaveChangesAsync();

                return Ok("Password changed successfully");

            }

            catch (Exception ex)

            {

                return StatusCode(500, ex.Message);

            }

        }

        [HttpGet("download-full-master")]

        public async Task<IActionResult> DownloadFullMaster()

        {

            var fileBytes =

                await _employeeService.ExportFullEmployeeMaster();

            return File(

                fileBytes,

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                $"Employee_Master_{DateTime.Now:dd_MMM_yyyy}.xlsx");

        }

        [HttpGet("export-profile-pdf/{employeeId}")]
        public async Task<IActionResult> ExportEmployeeProfilePdf(string employeeId)
        {
            var pdf = await _employeeService
                .ExportEmployeeProfilePdf(employeeId);

            return File(
                pdf,
                "application/pdf",
                $"EmployeeProfile_{employeeId}.pdf");
        }

    }

}

