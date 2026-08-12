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

        public string GenerateToken(
    Register user,
    string roleName,
    string employeeId,
    int? adminId)
        {
            var claims = new List<Claim>
    {
        new Claim(
            ClaimTypes.Email,
            user.Email),

        new Claim(
            ClaimTypes.NameIdentifier,
            user.RoleId.ToString()),

        new Claim(
            "RoleId",
            user.RoleId.ToString()),

        new Claim(
            ClaimTypes.Role,
            roleName),

        new Claim(
            "EmployeeId",
            employeeId)
    };

            // Add AdminId only when available
            if (adminId.HasValue)
            {
                claims.Add(
                    new Claim(
                        "AdminId",
                        adminId.Value.ToString()));
            }

            var key =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        _config["Jwt:Key"]!));

            var creds =
                new SigningCredentials(
                    key,
                    SecurityAlgorithms.HmacSha256);

            var token =
                new JwtSecurityToken(
                    issuer: _config["Jwt:Issuer"],
                    audience: _config["Jwt:Audience"],
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(2),
                    signingCredentials: creds);

            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }
        public string GenerateOnboardingToken(OnboardingCandidate candidate)
        {
            var claims = new[]
            {
        new Claim(ClaimTypes.Email, candidate.Email),

        // Identify the login type
        new Claim("UserType", "Onboarding"),

        // Candidate Id
        new Claim("OnboardingId", candidate.OnboardingId),

        // Optional: use Role as Onboarding
        new Claim(ClaimTypes.Role, "Onboarding")
    };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]));

            var creds = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);

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
