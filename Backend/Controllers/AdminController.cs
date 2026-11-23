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
        private readonly MasterDbContext _masterDb;

        public AdminController(
            IConfiguration configuration,
            AppDbContext context,
            MasterDbContext masterDb)
        {
            _configuration = configuration;
            _context = context;
            _masterDb = masterDb;
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
        public async Task<IActionResult> Login([FromBody] LoginDto? dto)
        {
            // 1. Validate Input (Check dto is not null first)
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Invalid credentials"
                });
            }


        

        string email = dto.Email.Trim().ToLower();

            // 2. Find Admin (Case-insensitive) - Check tenant context first, then fallback to Master DB
            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.Email.ToLower() == email);

            bool isFromMaster = false;
            if (admin == null)
            {
                admin = await _masterDb.Admins
                    .FirstOrDefaultAsync(a => a.Email.ToLower() == email);
                if (admin != null)
                {
                    isFromMaster = true;
                }
            }

            if (admin == null)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Invalid credentials"
                });
            }

            // 3. Block Inactive Admin Account

            if (!admin.IsActive)

            {

                return Unauthorized(new

                {

                    Status = false,

                    Message = "Your account is inactive. Please contact Super Admin."

                });

            }

            // 4. Validate Organization Subscription
            var effectiveSub = await SubscriptionHelper.GetEffectiveSubscriptionAsync(
                _context,
                admin.Id,
                admin.OrganizationId,
                _masterDb);

            if (!effectiveSub.IsActive)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "Subscription expired or inactive."
                });
            }

            // 5. Verify Password (Supports BCrypt and Plain-Text fallback)

            bool isPasswordValid = false;

            if (!string.IsNullOrWhiteSpace(admin.Password))

            {

                if (admin.Password.StartsWith("$2a$") || admin.Password.StartsWith("$2b$") || admin.Password.StartsWith("$2y$"))

                {

                    try

                    {

                        isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, admin.Password);

                    }

                    catch

                    {

                        isPasswordValid = admin.Password == dto.Password;

                    }

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

                    Status = false,

                    Message = "Invalid credentials"

                });

            }

            // 6. Update Last Login
            admin.LastLogin = DateTime.UtcNow;
            if (isFromMaster)
            {
                try { await _masterDb.SaveChangesAsync(); } catch { }
            }
            else
            {
                try { await _context.SaveChangesAsync(); } catch { }
            }

            // 6b. Resolve OrganizationCode for Multi-Tenant routing
            string orgCode = string.Empty;
            if (admin.OrganizationId.HasValue && admin.OrganizationId.Value > 0)
            {
                var org = await _masterDb.Organizations.FirstOrDefaultAsync(o => o.Id == admin.OrganizationId.Value);
                if (org != null && !string.IsNullOrWhiteSpace(org.OrganizationCode))
                {
                    orgCode = org.OrganizationCode.Trim().ToLower();
                }
            }
            
            if (string.IsNullOrEmpty(orgCode))
            {
                var mu = await _masterDb.MasterUsers.FirstOrDefaultAsync(u => u.Email.ToLower() == admin.Email.ToLower());
                if (mu != null && !string.IsNullOrWhiteSpace(mu.OrganizationCode))
                {
                    orgCode = mu.OrganizationCode.Trim().ToLower();
                }
            }

            if (string.IsNullOrEmpty(orgCode))
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "No organization is associated with this admin account. Please contact Super Admin."
                });
            }

            // 7. Generate JWT Token
            var token = GenerateJwtToken(admin, orgCode);

            // 8. Return Successful Response
            return Ok(new
            {
                Status = true,
                Message = "Login successful",
                token,
                organizationCode = orgCode,
                tenantId = orgCode,
                redirectUrl = $"/{orgCode}/dashboard",
                admin = new
                {
                    admin.Id,
                    admin.Email,
                    admin.FullName,
                    admin.Role,
                    admin.IsActive,
                    admin.OrganizationId,
                    admin.OrganizationName,
                    organizationCode = orgCode,
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
        private string GenerateJwtToken(Admin admin, string? organizationCode = null)
        {
            var claims = new List<Claim>
            {
                new Claim("AdminId", admin.Id.ToString()),
                new Claim("OrganizationId", (admin.OrganizationId ?? 0).ToString()),
                new Claim(ClaimTypes.Email, admin.Email),
                new Claim(ClaimTypes.Role, admin.Role)
            };

            if (!string.IsNullOrEmpty(organizationCode))
            {
                claims.Add(new Claim("OrganizationCode", organizationCode));
            }

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
