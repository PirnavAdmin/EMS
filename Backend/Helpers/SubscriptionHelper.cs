using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Helpers
{
    public class EffectiveSubscriptionResult
    {
        public bool IsActive { get; set; }
        public int MaxUsers { get; set; }
        public int CurrentUsers { get; set; }
        public int RemainingUsers { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Source { get; set; } = "None"; // "Admin", "Organization", "Combined", "None"
        public string? PlanName { get; set; }
        public AdminSubscription? AdminSubscription { get; set; }
        public OrganizationSubscription? OrganizationSubscription { get; set; }
    }

    public static class SubscriptionHelper
    {
        public static async Task<EffectiveSubscriptionResult> GetEffectiveSubscriptionAsync(
            AppDbContext context,
            int? adminId,
            int? organizationId = null)
        {
            var now = DateTime.UtcNow;
            Admin? admin = null;

            // Normalize: treat 0 or negative organizationId as null (no organization)
            if (organizationId.HasValue && organizationId.Value <= 0)
            {
                organizationId = null;
            }

            if (adminId.HasValue && adminId.Value > 0)
            {
                admin = await context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId.Value);
                if (admin != null && !organizationId.HasValue)
                {
                    organizationId = admin.OrganizationId > 0 ? admin.OrganizationId : null;
                }
            }

            // 1. Fetch active Admin Subscriptions
            var activeAdminSubs = new List<AdminSubscription>();

            if (organizationId.HasValue && organizationId.Value > 0)
            {
                var orgAdminIds = await context.Admins
                    .AsNoTracking()
                    .Where(a => a.OrganizationId == organizationId.Value)
                    .Select(a => a.Id)
                    .ToListAsync();

                if (adminId.HasValue && adminId.Value > 0 && !orgAdminIds.Contains(adminId.Value))
                {
                    orgAdminIds.Add(adminId.Value);
                }

                activeAdminSubs = await context.AdminSubscriptions
                    .AsNoTracking()
                    .Where(s => orgAdminIds.Contains(s.AdminId) &&
                                s.IsActive &&
                                s.StartDate <= now &&
                                s.EndDate >= now)
                    .ToListAsync();
            }
            else if (adminId.HasValue && adminId.Value > 0)
            {
                var sub = await context.AdminSubscriptions
                    .AsNoTracking()
                    .Where(s => s.AdminId == adminId.Value &&
                                s.IsActive &&
                                s.StartDate <= now &&
                                s.EndDate >= now)
                    .OrderByDescending(s => s.SubscriptionId)
                    .FirstOrDefaultAsync();

                if (sub != null) activeAdminSubs.Add(sub);
            }

            // 2. Fetch Organization Subscription
            OrganizationSubscription? latestOrgSub = null;
            OrganizationSubscription? activeOrgSub = null;
            if (organizationId.HasValue && organizationId.Value > 0)
            {
                latestOrgSub = await context.OrganizationSubscriptions
                    .AsNoTracking()
                    .Where(s => s.OrganizationId == organizationId.Value)
                    .OrderByDescending(s => s.Id)
                    .FirstOrDefaultAsync();

                if (latestOrgSub != null && latestOrgSub.IsActive && latestOrgSub.StartDate <= now && latestOrgSub.EndDate >= now)
                {
                    activeOrgSub = latestOrgSub;
                }
            }

            var primaryAdminSub = activeAdminSubs.OrderByDescending(s => s.MaxUsers).FirstOrDefault();

            var result = new EffectiveSubscriptionResult
            {
                AdminSubscription = primaryAdminSub,
                OrganizationSubscription = activeOrgSub ?? latestOrgSub
            };

            // 3. Resolve Effective Subscription:
            // - If BOTH Admin and Organization subscriptions are active -> Combine with Max(All)
            // - If ONLY Organization subscription is active -> Use Organization subscription
            // - If ONLY Admin subscription is active (or Org sub is inactive/expired/none) -> Use Admin subscription
            // - If NEITHER is active -> Inactive (deny access)
            if (activeAdminSubs.Any() && activeOrgSub != null)
            {
                result.IsActive = true;
                int maxAdminUsers = activeAdminSubs.Max(s => s.MaxUsers);
                DateTime minAdminStart = activeAdminSubs.Min(s => s.StartDate);
                DateTime maxAdminEnd = activeAdminSubs.Max(s => s.EndDate);

                result.MaxUsers = Math.Max(maxAdminUsers, activeOrgSub.MaxUsers);
                result.StartDate = minAdminStart < activeOrgSub.StartDate ? minAdminStart : activeOrgSub.StartDate;
                result.EndDate = maxAdminEnd > activeOrgSub.EndDate ? maxAdminEnd : activeOrgSub.EndDate;
                result.PlanName = activeOrgSub.PlanName ?? "Combined Plan";
                result.Source = "Combined";
            }
            else if (activeOrgSub != null)
            {
                result.IsActive = true;
                result.MaxUsers = activeOrgSub.MaxUsers;
                result.StartDate = activeOrgSub.StartDate;
                result.EndDate = activeOrgSub.EndDate;
                result.PlanName = activeOrgSub.PlanName;
                result.Source = "Organization";
            }
            else if (activeAdminSubs.Any())
            {
                result.IsActive = true;
                result.MaxUsers = activeAdminSubs.Max(s => s.MaxUsers);
                result.StartDate = activeAdminSubs.Min(s => s.StartDate);
                result.EndDate = activeAdminSubs.Max(s => s.EndDate);
                result.PlanName = "Admin Plan";
                result.Source = "Admin";
            }
            else
            {
                // Neither is active
                result.IsActive = false;
                if (latestOrgSub != null)
                {
                    result.MaxUsers = latestOrgSub.MaxUsers;
                    result.StartDate = latestOrgSub.StartDate;
                    result.EndDate = latestOrgSub.EndDate;
                    result.PlanName = latestOrgSub.PlanName;
                    result.Source = "Organization";
                }
                else if (primaryAdminSub != null)
                {
                    result.MaxUsers = primaryAdminSub.MaxUsers;
                    result.StartDate = primaryAdminSub.StartDate;
                    result.EndDate = primaryAdminSub.EndDate;
                    result.PlanName = "Admin Plan";
                    result.Source = "Admin";
                }
                else
                {
                    result.Source = "None";
                }
                return result;
            }

            // 4. Calculate Current User Count
            if (organizationId.HasValue && organizationId.Value > 0)
            {
                result.CurrentUsers = await context.Employees
                    .CountAsync(e => e.OrganizationId == organizationId.Value);
            }
            else if (adminId.HasValue && adminId.Value > 0)
            {
                // Standalone admin: count employees under this Admin
                result.CurrentUsers = await context.Employees
                    .CountAsync(e => e.AdminId == adminId.Value);
            }

            result.RemainingUsers = Math.Max(0, result.MaxUsers - result.CurrentUsers);
            return result;
        }
    }
}
