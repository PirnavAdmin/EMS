using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

using Microsoft.IdentityModel.Tokens;

using System.IdentityModel.Tokens.Jwt;

using System.Security.Claims;

using System.Text;

namespace EmployeeManagementSystem.Services

{

    public class SuperAdminService : ISuperAdminService

    {

        private readonly AppDbContext _context;

        private readonly IConfiguration _configuration;

        public SuperAdminService(AppDbContext context, IConfiguration configuration)

        {

            _context = context;

            _configuration = configuration;

        }
        public async Task<object> Login(SuperAdminLoginDto dto)

        {

            var admin = await _context.SuperAdmins

                .FirstOrDefaultAsync(x =>

                    x.Email == dto.Email &&

                    x.IsActive);

            if (admin == null)

            {

                return new

                {

                    Success = false,

                    Message = "Invalid Email."

                };

            }

            // Replace with password hash verification later

            if (admin.PasswordHash != dto.Password)

            {

                return new

                {

                    Success = false,

                    Message = "Invalid Password."

                };

            }

            var claims = new[]

            {

                new Claim("SuperAdminId", admin.SuperAdminId.ToString()),

                new Claim(ClaimTypes.Name, admin.FullName),

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

                expires: DateTime.UtcNow.AddHours(12),

                signingCredentials: creds);

            admin.LastLogin = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new
            {
                Success = true,
                Message = "Login Successful",

                Token =
         new JwtSecurityTokenHandler()
             .WriteToken(token),

                Data = new
                {
                    admin.SuperAdminId,
                    admin.FullName,
                    admin.Email,
                    admin.Role
                }
            };

        }

        public async Task<SuperAdminDashboardDto> GetDashboard()
        {
            var today = DateTime.UtcNow.Date;

            // =========================================================
            // 1. GET ALL CLIENTS
            // Internally they are still stored in Admins table
            // =========================================================

            var admins = await _context.Admins
                .AsNoTracking()
                .ToListAsync();


            // =========================================================
            // 2. GET ALL SUBSCRIPTIONS
            // =========================================================

            var subscriptions = await _context.AdminSubscriptions
                .AsNoTracking()
                .ToListAsync();


            // =========================================================
            // 3. GET EMPLOYEE COUNTS GROUPED BY ADMIN/CLIENT
            // =========================================================

            var employeeCounts = await _context.Employees
                .AsNoTracking()
                .Where(x => x.AdminId != null)
                .GroupBy(x => x.AdminId)
                .Select(g => new
                {
                    AdminId = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();


            // =========================================================
            // 4. CREATE DASHBOARD RESULT
            // =========================================================

            var result = new SuperAdminDashboardDto
            {
                TotalClients = admins.Count,

                ActiveClients = admins.Count(x => x.IsActive),

                InactiveClients = admins.Count(x => !x.IsActive)
            };


            // =========================================================
            // 5. BUILD EACH CLIENT DETAILS
            // =========================================================

            foreach (var admin in admins)
            {
                // Get latest subscription for this client
                var subscription = subscriptions
                    .Where(x => x.AdminId == admin.Id)
                    .OrderByDescending(x => x.SubscriptionId)
                    .FirstOrDefault();


                // Number of employees belonging to this client
                var currentUsers = employeeCounts
                    .FirstOrDefault(x => x.AdminId == admin.Id)
                    ?.Count ?? 0;


                int maxUsers = 0;

                int remainingUsers = 0;

                int daysRemaining = 0;

                DateTime? startDate = null;

                DateTime? endDate = null;

                string subscriptionStatus = "No Subscription";


                // =====================================================
                // SUBSCRIPTION EXISTS
                // =====================================================

                if (subscription != null)
                {
                    maxUsers = subscription.MaxUsers;

                    remainingUsers = Math.Max(
                        0,
                        maxUsers - currentUsers);


                    startDate = subscription.StartDate;

                    endDate = subscription.EndDate;


                    // Calculate remaining days
                    daysRemaining = Math.Max(
                        0,
                        (subscription.EndDate.Date - today).Days);


                    // =================================================
                    // DETERMINE SUBSCRIPTION STATUS
                    // =================================================

                    if (!subscription.IsActive)
                    {
                        subscriptionStatus = "Inactive";
                    }
                    else if (subscription.EndDate.Date < today)
                    {
                        subscriptionStatus = "Expired";
                    }
                    else if (subscription.StartDate.Date > today)
                    {
                        subscriptionStatus = "Upcoming";
                    }
                    else if (daysRemaining <= 7)
                    {
                        subscriptionStatus = "Expiring Soon";
                    }
                    else
                    {
                        subscriptionStatus = "Active";
                    }
                }


                // =====================================================
                // ADD CLIENT TO DASHBOARD
                // =====================================================

                result.Clients.Add(
                    new ClientDashboardItemDto
                    {
                        // Admin.Id exposed as ClientId
                        ClientId = admin.Id,

                        Email = admin.Email,

                        IsActive = admin.IsActive,

                        MaxUsers = maxUsers,

                        CurrentUsers = currentUsers,

                        RemainingUsers = remainingUsers,

                        StartDate = startDate,

                        EndDate = endDate,

                        SubscriptionStatus = subscriptionStatus,

                        DaysRemaining = daysRemaining
                    });
            }


            // =========================================================
            // 6. CALCULATE SUBSCRIPTION COUNTS
            // =========================================================

            result.ActiveSubscriptions =
                result.Clients.Count(x =>
                    x.SubscriptionStatus == "Active");


            result.ExpiredSubscriptions =
                result.Clients.Count(x =>
                    x.SubscriptionStatus == "Expired");


            result.ExpiringSoon =
                result.Clients.Count(x =>
                    x.SubscriptionStatus == "Expiring Soon");


            result.NoSubscription =
                result.Clients.Count(x =>
                    x.SubscriptionStatus == "No Subscription");


            // =========================================================
            // 7. CALCULATE TOTAL USER CAPACITY
            // =========================================================

            result.TotalAllowedUsers =
                result.Clients.Sum(x => x.MaxUsers);


            result.TotalCurrentUsers =
                result.Clients.Sum(x => x.CurrentUsers);


            result.TotalRemainingUsers =
                result.Clients.Sum(x => x.RemainingUsers);


            // =========================================================
            // 8. ORDER CLIENTS
            // =========================================================

            result.Clients = result.Clients
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.Email)
                .ToList();


            return result;
        }

    }

}
