using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;

using Microsoft.AspNetCore.Mvc;

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
        [HttpPost("login")]

        public IActionResult Login(LoginDto dto)

        {

            var admin = _context.Admins.FirstOrDefault(a =>

                a.Email == dto.Email &&

                a.Password == dto.Password);

            if (admin != null)

            {

                var token = GenerateJwtToken(dto.Email);

                return Ok(new

                {

                    message = "Login successful",

                    token = token

                });

            }

            return Unauthorized("Invalid credentials");

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


        private string GenerateJwtToken(string email)

        {

            var claims = new[]

            {

                new Claim(ClaimTypes.Email, email),

                new Claim(ClaimTypes.Role, "Admin")

            };

            var key = new SymmetricSecurityKey(

                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));

            var creds = new SigningCredentials(

                key,

                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(

                issuer: _configuration["Jwt:Issuer"],

                audience: _configuration["Jwt:Audience"],

                claims: claims,

                expires: DateTime.Now.AddHours(2),

                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);

        }

    }

}
