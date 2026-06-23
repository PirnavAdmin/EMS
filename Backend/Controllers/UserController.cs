using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Helpers;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.IdentityModel.Tokens.Jwt;

namespace EmployeeManagementSystem.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    public class UserController : ControllerBase

    {

        private readonly AppDbContext _context;

        private readonly IEmailService _emailService;

        private readonly JwtHelper _jwtHelper;
        private readonly IAdminNotificationService _notificationService;

        public UserController(

            AppDbContext context,

            IEmailService emailService,

            JwtHelper jwtHelper,
             IAdminNotificationService notificationService)

        {

            _context = context;

            _emailService = emailService;

            _jwtHelper = jwtHelper;
            _notificationService = notificationService;

        }

        // ================= REGISTER =================
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest("Passwords do not match");

            if (await _context.Users.AnyAsync(x => x.Email == dto.Email))
                return BadRequest("Email already exists");

            var employeeExists = await _context.Employees
                .AnyAsync(e => e.Email == dto.Email);

            if (!employeeExists)
            {
                return NotFound(new
                {
                    message = "Email does not exist in the employee list"
                });
            }

            var defaultRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name.ToLower() == "employee");

            if (defaultRole == null)
                return StatusCode(500, "Default role 'Employee' not found. Please seed the Roles table.");

            var user = new Register
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = defaultRole.RoleId
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // SEND NOTIFICATION TO ADMIN
            await _notificationService.CreateNotification(
                "New User Registered",
                $"{dto.FirstName} {dto.LastName} has registered successfully."
            );

            return Ok(new
            {
                message = "Registered successfully",
                roleAssigned = defaultRole.Name
            });
        }

        /// ================= LOGIN =================
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Email == dto.Email);

            if (user == null ||
                !BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
            {
                return Unauthorized("Invalid credentials");
            }

            if (user.RoleId == null)
            {
                return Unauthorized("Role not assigned");
            }

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleId == user.RoleId);

            if (role == null)
            {
                return Unauthorized("Role not found");
            }

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == user.Email);

            if (employee == null)
            {
                return Unauthorized("Employee not found");
            }

            var employeeName = employee.Name;

            if (string.IsNullOrWhiteSpace(employeeName))
            {
                employeeName = employee.Email;
            }

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"{employeeName} logged in",
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();


            var token = _jwtHelper.GenerateToken(
                user,
                role.Name,
                employee.Employee_Id
            );

            return Ok(new
            {
                token,

                email = user.Email,

                userId = user.Id,

                employeeId = employee.Employee_Id,

                roleId = user.RoleId,

                roleName = role.Name
            });
        } // ================= FORGOT PASSWORD =================

        [HttpPost("forgot-password")]

        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto dto)

        {

            var user = await _context.Users

                .FirstOrDefaultAsync(x => x.Email == dto.Email);

            if (user == null)

                return NotFound("Email not registered");

            var otp = new Random().Next(100000, 999999).ToString();

            user.OtpCode = otp;

            user.OtpExpiry = DateTime.UtcNow.AddMinutes(5);

            user.IsOtpVerified = false;

            await _context.SaveChangesAsync();

            try

            {

                _emailService.SendOtp(user.Email, otp);

            }

            catch (Exception ex)

            {

                return StatusCode(500, "Email sending failed: " + ex.Message);

            }

            return Ok("OTP sent successfully");

        }


        // ================= VERIFY OTP =================

        [HttpPost("verify-otp")]

        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)

        {

            var user = await _context.Users

                .FirstOrDefaultAsync(x => x.Email == dto.Email);

            if (user == null)

                return BadRequest("User not found");

            if (user.OtpExpiry < DateTime.UtcNow)

                return BadRequest("OTP expired");

            if (user.OtpCode.Trim() != dto.Otp.Trim())

                return BadRequest("Invalid OTP");

            user.IsOtpVerified = true;

            await _context.SaveChangesAsync();

            return Ok("OTP verified successfully");

        }


        // ================= RESET PASSWORD =================

        [HttpPost("reset-password")]

        public async Task<IActionResult> ResetPassword(ResetPasswordDto dto)

        {

            if (!ModelState.IsValid)

                return BadRequest(ModelState);

            // Find user who has verified OTP

            var user = await _context.Users

                .FirstOrDefaultAsync(x => x.IsOtpVerified == true);

            if (user == null)

                return BadRequest("OTP not verified or session expired");

            // Update password

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // Clear OTP fields

            user.OtpCode = null;

            user.OtpExpiry = null;

            user.IsOtpVerified = false;

            await _context.SaveChangesAsync();

            return Ok("Password reset successful");

        }

    }

}

