using DocumentFormat.OpenXml.Spreadsheet;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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
        //[HttpPost("login")]
        //public IActionResult Login(LoginDto dto)
        //{
        //    var admin = _context.Admins
        //        .FirstOrDefault(a => a.Email == dto.Email);

        //    if (admin == null)
        //    {
        //        return Unauthorized(new
        //        {
        //            message = "Invalid credentials"
        //        });
        //    }

        //    // Block inactive admin
        //    if (!admin.IsActive)
        //    {
        //        return Unauthorized(new
        //        {
        //            message = "Your account is inactive. Please contact Super Admin."
        //        });
        //    }

        //    if (admin.Password != dto.Password)
        //    {
        //        return Unauthorized(new
        //        {
        //            message = "Invalid credentials"
        //        });
        //    }


        //    var token = GenerateJwtToken(admin);

        //    return Ok(new
        //    {
        //        message = "Login successful",
        //        token,
        //        admin = new
        //        {
        //            admin.Id,
        //            admin.Email,
        //            admin.IsActive
        //        }
        //    });
        //}

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.Email == dto.Email);

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

            // Existing password verification (commented out):
            // if (admin.Password != dto.Password)
            // {
            //     return Unauthorized(new
            //     {
            //         message = "Invalid credentials"
            //     });
            // }

            // Verify password (supports BCrypt as well as plain text)
            bool isPasswordValid = false;
            if (!string.IsNullOrWhiteSpace(admin.Password))
            {
                if (admin.Password.StartsWith("$2a$") || admin.Password.StartsWith("$2b$") || admin.Password.StartsWith("$2y$"))
                {
                    try { isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, admin.Password); }
                    catch { isPasswordValid = admin.Password == dto.Password; }
                }
                else
                {
                    isPasswordValid = admin.Password == dto.Password;
                }
            }

            if (!isPasswordValid)
            {
                return Unauthorized(new
                {
                    message = "Invalid credentials"
                });
            }

            // Subscription validation (Admin + Organization)
            var effectiveSub = await SubscriptionHelper.GetEffectiveSubscriptionAsync(
                _context,
                admin.Id,
                admin.OrganizationId);

            if (!effectiveSub.IsActive)
            {
                return Unauthorized(new
                {
                    message = "Your subscription is inactive or expired. Please contact Super Admin."
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
                    admin.IsActive,
                    admin.OrganizationId,
                    admin.OrganizationName,
                    subscription = new
                    {
                        effectiveSub.MaxUsers,
                        effectiveSub.CurrentUsers,
                        effectiveSub.RemainingUsers,
                        effectiveSub.StartDate,
                        effectiveSub.EndDate,
                        effectiveSub.Source,
                        effectiveSub.PlanName
                    }
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

            // Existing code (commented out to allow updating existing admin without duplicate error):
            // var exists = await _context.Admins
            //     .AnyAsync(x => x.Email == dto.Email);
            // if (exists)
            //     return BadRequest("Admin already exists.");

            var existing = await _context.Admins
                .FirstOrDefaultAsync(x => x.Email.ToLower() == dto.Email.Trim().ToLower());

            if (existing != null)
            {
                existing.Password = dto.Password;
                existing.IsActive = true;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Existing admin updated successfully.",
                    AdminId = existing.Id
                });
            }

            var admin = new Admin
            {
                Email = dto.Email.Trim(),
                Password = dto.Password,
                Role = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Admins.Add(admin);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Admin created successfully.",
                AdminId = admin.Id
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
                Role = admin.Role
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
