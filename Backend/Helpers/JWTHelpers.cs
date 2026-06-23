using EmployeeManagementSystem.Models;

using Microsoft.IdentityModel.Tokens;

using System.IdentityModel.Tokens.Jwt;

using System.Security.Claims;

using System.Text;

namespace EmployeeManagementSystem.Helpers

{

    public class JwtHelper

    {

        private readonly IConfiguration _config;

        public JwtHelper(IConfiguration config)

        {

            _config = config;

        }

        // ✅ Updated method (added employeeId)

        public string GenerateToken(Register user, string roleName, string employeeId)

        {

            var claims = new[]

            {

                new Claim(ClaimTypes.Email, user.Email),
 
                // KEEP AS IS (no change)

                new Claim(ClaimTypes.NameIdentifier, user.RoleId.ToString()),
 
                // KEEP AS IS

                new Claim("RoleId", user.RoleId.ToString()),
 
                // KEEP AS IS

                new Claim(ClaimTypes.Role, roleName),
 
                // ✅ NEW CLAIM (IMPORTANT FIX)

                new Claim("EmployeeId", employeeId)

            };

            var key = new SymmetricSecurityKey(

                Encoding.UTF8.GetBytes(_config["Jwt:Key"]));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(

                issuer: _config["Jwt:Issuer"],

                audience: _config["Jwt:Audience"],

                claims: claims,

                expires: DateTime.Now.AddHours(2),

                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);

        }

    }

}
