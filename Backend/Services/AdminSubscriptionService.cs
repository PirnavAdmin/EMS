using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class AdminSubscriptionService : IAdminSubscriptionService
    {
        private readonly AppDbContext _context;

        public AdminSubscriptionService(AppDbContext context)
        {
            _context = context;
        }


        // =====================================================
        // CREATE SUBSCRIPTION
        // =====================================================
        public async Task<object> CreateSubscription(
            AdminSubscriptionDto dto)
        {
            if (dto.MaxUsers <= 0)
                throw new Exception(
                    "Maximum users must be greater than zero.");

            if (dto.EndDate <= dto.StartDate)
                throw new Exception(
                    "End date must be greater than start date.");

            // Check Admin
            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == dto.AdminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            // Check existing subscription
            var existing = await _context.AdminSubscriptions
                .FirstOrDefaultAsync(x =>
                    x.AdminId == dto.AdminId);

            if (existing != null)
                throw new Exception(
                    "Subscription already exists for this Admin.");

            var subscription = new AdminSubscription
            {
                AdminId = dto.AdminId,
                MaxUsers = dto.MaxUsers,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = dto.IsActive,
                CreatedDate = DateTime.UtcNow
            };

            await _context.AdminSubscriptions
                .AddAsync(subscription);

            await _context.SaveChangesAsync();

            return new
            {
                Message = "Subscription created successfully.",

                subscription.SubscriptionId,
                subscription.AdminId,
                AdminEmail = admin.Email,
                subscription.MaxUsers,
                subscription.StartDate,
                subscription.EndDate,
                subscription.IsActive
            };
        }


        // =====================================================
        // GET SUBSCRIPTION BY ADMIN
        // =====================================================
        public async Task<object> GetSubscription(int adminId)
        {
            // Existing single-subscription code (commented out):
            // var subscription = await _context.AdminSubscriptions
            //     .Where(x => x.AdminId == adminId)
            //     .OrderByDescending(x => x.SubscriptionId)
            //     .FirstOrDefaultAsync();
            // if (subscription == null)
            //     throw new Exception("Subscription not found.");
            // var admin = await _context.Admins
            //     .FirstOrDefaultAsync(x => x.Id == adminId);
            // var currentUsers = await _context.Employees
            //     .CountAsync(x => x.AdminId == adminId);

            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            var effectiveSub = await Helpers.SubscriptionHelper.GetEffectiveSubscriptionAsync(
                _context,
                adminId,
                admin.OrganizationId);

            return new
            {
                SubscriptionId = effectiveSub.AdminSubscription?.SubscriptionId ?? effectiveSub.OrganizationSubscription?.Id ?? 0,
                AdminId = adminId,
                AdminEmail = admin.Email,
                OrganizationId = admin.OrganizationId,
                OrganizationName = admin.OrganizationName,
                MaxUsers = effectiveSub.MaxUsers,
                CurrentUsers = effectiveSub.CurrentUsers,
                RemainingUsers = effectiveSub.RemainingUsers,
                StartDate = effectiveSub.StartDate,
                EndDate = effectiveSub.EndDate,
                IsActive = effectiveSub.IsActive,
                Source = effectiveSub.Source,
                PlanName = effectiveSub.PlanName,
                IsExpired = !effectiveSub.IsActive || effectiveSub.EndDate < DateTime.UtcNow
            };
        }


        // =====================================================
        // GET ALL SUBSCRIPTIONS
        // =====================================================
        public async Task<object> GetAllSubscriptions()
        {
            var subscriptions =
                await _context.AdminSubscriptions
                    .OrderByDescending(x => x.SubscriptionId)
                    .ToListAsync();

            var result = new List<object>();

            foreach (var subscription in subscriptions)
            {
                var admin = await _context.Admins
                    .FirstOrDefaultAsync(x =>
                        x.Id == subscription.AdminId);

                var effectiveSub = await Helpers.SubscriptionHelper.GetEffectiveSubscriptionAsync(
                    _context,
                    subscription.AdminId,
                    admin?.OrganizationId);

                result.Add(new
                {
                    subscription.SubscriptionId,
                    subscription.AdminId,
                    AdminEmail = admin?.Email,
                    OrganizationId = admin?.OrganizationId,
                    OrganizationName = admin?.OrganizationName,
                    MaxUsers = effectiveSub.IsActive ? effectiveSub.MaxUsers : subscription.MaxUsers,
                    CurrentUsers = effectiveSub.CurrentUsers,
                    RemainingUsers = effectiveSub.IsActive ? effectiveSub.RemainingUsers : Math.Max(0, subscription.MaxUsers - effectiveSub.CurrentUsers),
                    StartDate = effectiveSub.IsActive ? effectiveSub.StartDate : subscription.StartDate,
                    EndDate = effectiveSub.IsActive ? effectiveSub.EndDate : subscription.EndDate,
                    IsActive = effectiveSub.IsActive,
                    Source = effectiveSub.Source,
                    PlanName = effectiveSub.PlanName,
                    IsExpired = !effectiveSub.IsActive || effectiveSub.EndDate < DateTime.UtcNow
                });
            }

            return result;
        }


        // =====================================================
        // UPDATE / RENEW SUBSCRIPTION
        // =====================================================
        public async Task<object> UpdateSubscription(
            int adminId,
            AdminSubscriptionDto dto)
        {
            var subscription =
                await _context.AdminSubscriptions
                    .Where(x => x.AdminId == adminId)
                    .OrderByDescending(x => x.SubscriptionId)
                    .FirstOrDefaultAsync();

            if (subscription == null)
                throw new Exception(
                    "Subscription not found.");

            if (dto.MaxUsers <= 0)
                throw new Exception(
                    "Maximum users must be greater than zero.");

            if (dto.EndDate <= dto.StartDate)
                throw new Exception(
                    "End date must be greater than start date.");

            var currentUsers = await _context.Employees
                .CountAsync(x => x.AdminId == adminId);

            // Prevent reducing plan below current usage
            if (dto.MaxUsers < currentUsers)
            {
                throw new Exception(
                    $"Cannot reduce user limit to {dto.MaxUsers}. " +
                    $"This Admin currently has {currentUsers} users.");
            }

            subscription.MaxUsers = dto.MaxUsers;
            subscription.StartDate = dto.StartDate;
            subscription.EndDate = dto.EndDate;
            subscription.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return new
            {
                Message = "Subscription updated successfully.",

                subscription.AdminId,
                subscription.MaxUsers,

                CurrentUsers = currentUsers,

                RemainingUsers =
                    subscription.MaxUsers - currentUsers,

                subscription.StartDate,
                subscription.EndDate,
                subscription.IsActive
            };
        }


        // =====================================================
        // USAGE
        // =====================================================
        public async Task<object> GetUsage(int adminId)
        {
            // Existing single-subscription code (commented out):
            // var subscription =
            //     await _context.AdminSubscriptions
            //         .Where(x => x.AdminId == adminId)
            //         .OrderByDescending(x => x.SubscriptionId)
            //         .FirstOrDefaultAsync();
            // if (subscription == null)
            //     throw new Exception("Subscription not found.");
            // var currentUsers = await _context.Employees
            //     .CountAsync(x => x.AdminId == adminId);

            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            var effectiveSub = await Helpers.SubscriptionHelper.GetEffectiveSubscriptionAsync(
                _context,
                adminId,
                admin.OrganizationId);

            return new
            {
                AdminId = adminId,
                OrganizationId = admin.OrganizationId,
                MaxUsers = effectiveSub.MaxUsers,
                CurrentUsers = effectiveSub.CurrentUsers,
                RemainingUsers = effectiveSub.RemainingUsers,
                StartDate = effectiveSub.StartDate,
                EndDate = effectiveSub.EndDate,
                IsActive = effectiveSub.IsActive,
                Source = effectiveSub.Source,
                PlanName = effectiveSub.PlanName,
                IsExpired = !effectiveSub.IsActive || effectiveSub.EndDate < DateTime.UtcNow
            };
        }
    }
}