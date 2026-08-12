using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Helpers;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using System.IdentityModel.Tokens.Jwt;
using System.Threading.Tasks;

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


        private async Task<string> GenerateOnboardingId()
        {
            var lastCandidate = await _context.OnboardingCandidates
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync();

            if (lastCandidate == null)
                return "OB001";

            int number = int.Parse(lastCandidate.OnboardingId.Replace("OB", ""));

            return $"OB{(number + 1):D3}";
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

            var employee = await _context.Employees
     .FirstOrDefaultAsync(e => e.Email == dto.Email);

            if (employee == null)
            {
                if (await _context.OnboardingCandidates.AnyAsync(x => x.Email == dto.Email))
                {
                    return BadRequest("Email already registered.");
                }

                var onboarding = new OnboardingCandidate
                {
                    OnboardingId = await GenerateOnboardingId(),
                    FullName = $"{dto.FirstName} {dto.LastName}".Trim(),
                    Email = dto.Email,
                    Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Status = "Pending"
                };

                _context.OnboardingCandidates.Add(onboarding);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Status = true,
                    Message = "Registration successful. Your onboarding request has been submitted.",
                    OnboardingId = onboarding.OnboardingId
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
        // ================= LOGIN =================
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            // First check normal users
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Email == dto.Email);


            if (user == null)
            {
                // Check onboarding candidates
                var candidate = await _context.OnboardingCandidates
                    .FirstOrDefaultAsync(x => x.Email == dto.Email);

                if (candidate == null)
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Invalid credentials."
                    });
                }

                if (!BCrypt.Net.BCrypt.Verify(dto.Password, candidate.Password))
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Invalid credentials."
                    });
                }

                // Don't allow already converted candidates to login through onboarding
                if (candidate.Status == "Approved")
                {
                    return Unauthorized(new
                    {
                        Status = false,
                        Message = "Your onboarding has been completed. Please login using your employee account."
                    });
                }

                var onboardingToken = _jwtHelper.GenerateOnboardingToken(candidate);

                return Ok(new
                {
                    Status = true,
                    Message = "Login successful.",
                    UserType = "Onboarding",
                    token = onboardingToken,
                    onboardingId = candidate.OnboardingId,
                    email = candidate.Email
                });
            }

            if (user.RoleId == null)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Role not assigned."
                });
            }

            var role = await _context.Roles
    .FirstOrDefaultAsync(r => r.RoleId == user.RoleId);

            if (role == null)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Role not found."
                });
            }

            // ✅ ADD THIS BLOCK
            if (!role.IsActive)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Your role is inactive. Please contact the administrator."
                });
            }

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == user.Email);
            string employeeId =
    employee?.Employee_Id ?? string.Empty;

            int? adminId =
                employee?.AdminId;


            if (employee == null)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Employee not found."
                });
            }

            // ✅ Check Employee Status
            if (string.Equals(employee.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Your account is inactive. Please contact the administrator."
                });
            }

            var employeeName = string.IsNullOrWhiteSpace(employee.Name)
                ? employee.Email
                : employee.Name;

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"{employeeName} logged in",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var token = _jwtHelper.GenerateToken(
      user,
      role.Name,
      employeeId,
      adminId);

            return Ok(new
            {
                Status = true,
                Message = "Login successful.",
                token = token,
                email = user.Email,
                userId = user.Id,
                employeeId = employee.Employee_Id,
                roleId = user.RoleId,
                adminId = employee.AdminId,
                roleName = role.Name
            });
        } // ================= FORGOT PASSWORD =================

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Email.ToLower() == dto.Email.ToLower());

            if (employee == null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Employee not found."
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Email.ToLower() == dto.Email.ToLower());

            if (user == null)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "User account not found."
                });
            }

            var otp = Random.Shared.Next(100000, 999999).ToString();

            user.OtpCode = otp;
            user.OtpExpiry = DateTime.UtcNow.AddMinutes(10);
            user.IsOtpVerified = false;

            await _context.SaveChangesAsync();

            await _emailService.SendOtpAsync(user.Email, otp);

            return Ok(new
            {
                Status = true,
                Message = "OTP sent successfully."
            });
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

