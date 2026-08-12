using DocumentFormat.OpenXml.Spreadsheet;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EmployeeManagementSystem.Models;

using Microsoft.IdentityModel.Tokens;

using System.IdentityModel.Tokens.Jwt;

using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

using System.Text;

namespace EmployeeManagementSystem.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    public class AdminController : ControllerBase

    {

        private readonly IConfiguration _configuration;

        private readonly AppDbContext _context;

        public AdminController(

    IConfiguration configuration,

    AppDbContext context)

        {

            _configuration = configuration;

            _context = context;

        }
        [HttpPost("login")]
        public IActionResult Login(LoginDto dto)
        {
            var admin = _context.Admins
                .FirstOrDefault(a => a.Email == dto.Email);

            if (admin == null)
            {
                return Unauthorized(new
                {
                    message = "Invalid credentials"
                });
            }

            // Block inactive admin
            if (!admin.IsActive)
            {
                return Unauthorized(new
                {
                    message = "Your account is inactive. Please contact Super Admin."
                });
            }

            if (admin.Password != dto.Password)
            {
                return Unauthorized(new
                {
                    message = "Invalid credentials"
                });
            }

            var token = GenerateJwtToken(admin);

            return Ok(new
            {
                message = "Login successful",
                token,
                admin = new
                {
                    admin.Id,
                    admin.Email,
                    admin.IsActive
                }
            });
        }
        [HttpPost("change-password")]
        public IActionResult ChangePassword(ChangePasswordDto dto)
        {
            try
            {
                // Find admin
                var admin = _context.Admins.FirstOrDefault(a =>
                    a.Email == dto.Email &&
                    a.Password == dto.OldPassword);

                if (admin == null)
                {
                    return BadRequest("Old password is incorrect");
                }

                // Check confirm password
                if (dto.NewPassword != dto.ConfirmPassword)
                {
                    return BadRequest("New password and confirm password do not match");
                }

                // Update password
                admin.Password = dto.NewPassword;

                _context.SaveChanges();

                return Ok("Password changed successfully");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }



        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateAdmin(CreateAdminDto dto)
        {
            // Only SuperAdmin can access
            if (!User.IsInRole("SuperAdmin"))
            {
                return Forbid("Only Super Admin can create admins.");
            }

            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest("Email is required.");

            if (string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Password is required.");

            var exists = await _context.Admins
                .AnyAsync(x => x.Email == dto.Email);

            if (exists)
                return BadRequest("Admin already exists.");

            var admin = new Admin
            {
                Email = dto.Email,
                Password = dto.Password,
                 Role = "Admin",
                IsActive = true
            };

            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Admin created successfully."
            });
        }


        [HttpGet]
        public async Task<IActionResult> GetAdmins()
        {
            var admins = await _context.Admins
                .Select(x => new
                {
                    x.Id,
                    x.Email,
                    x.IsActive,
                    x.Role
                })
                .OrderBy(x => x.Id)
                .ToListAsync();

            return Ok(admins);
        }


        [HttpPut("{adminId}/status")]
        public async Task<IActionResult> UpdateAdminStatus(
    int adminId,
    [FromBody] UpdateAdminStatusDto dto)
        {
            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
            {
                return NotFound(new
                {
                    message = "Admin not found."
                });
            }

            admin.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = dto.IsActive
                    ? "Admin activated successfully."
                    : "Admin deactivated successfully.",

                adminId = admin.Id,
                email = admin.Email,
                isActive = admin.IsActive,
                Role=admin.Role
            });
        }
        private string GenerateJwtToken(Admin admin)
        {
            var claims = new[]
            {
        new Claim("AdminId", admin.Id.ToString()),
        new Claim(ClaimTypes.Email, admin.Email),
        new Claim(ClaimTypes.Role, admin.Role)
    };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

            var creds = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
