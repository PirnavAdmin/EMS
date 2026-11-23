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
        public string Source { get; set; } = "Organization";
        public string? PlanName { get; set; }
        public AdminSubscription? AdminSubscription { get; set; }
        public OrganizationSubscription? OrganizationSubscription { get; set; }
    }

    public static class SubscriptionHelper
    {
        public static async Task<EffectiveSubscriptionResult> GetEffectiveSubscriptionAsync(
            AppDbContext context,
            int? adminId,
            int? organizationId = null,
            MasterDbContext? masterContext = null)
        {
            var now = DateTime.UtcNow;

            // 1. Resolve OrganizationId if only adminId was passed
            if ((!organizationId.HasValue || organizationId.Value <= 0) && adminId.HasValue && adminId.Value > 0)
            {
                var admin = await context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId.Value);
                if (admin != null && admin.OrganizationId.HasValue && admin.OrganizationId.Value > 0)
                {
                    organizationId = admin.OrganizationId.Value;
                }
                else if (masterContext != null)
                {
                    var mAdmin = await masterContext.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId.Value);
                    if (mAdmin != null && mAdmin.OrganizationId.HasValue && mAdmin.OrganizationId.Value > 0)
                    {
                        organizationId = mAdmin.OrganizationId.Value;
                    }
                }
            }

            // 2. Query OrganizationSubscription (Strictly organization-based)
            OrganizationSubscription? latestOrgSub = null;
            OrganizationSubscription? activeOrgSub = null;

            if (organizationId.HasValue && organizationId.Value > 0)
            {
                if (masterContext != null)
                {
                    latestOrgSub = await masterContext.OrganizationSubscriptions.AsNoTracking()
                        .Where(s => s.OrganizationId == organizationId.Value)
                        .OrderByDescending(s => s.Id)
                        .FirstOrDefaultAsync();
                }
                else
                {
                    try
                    {
                        latestOrgSub = await context.OrganizationSubscriptions.AsNoTracking()
                            .Where(s => s.OrganizationId == organizationId.Value)
                            .OrderByDescending(s => s.Id)
                            .FirstOrDefaultAsync();
                    }
                    catch
                    {
                        // Table may not exist in tenant database
                    }
                }

                if (latestOrgSub != null && latestOrgSub.IsActive && latestOrgSub.StartDate <= now && latestOrgSub.EndDate >= now)
                {
                    activeOrgSub = latestOrgSub;
                }
            }

            var result = new EffectiveSubscriptionResult
            {
                OrganizationSubscription = activeOrgSub ?? latestOrgSub,
                Source = "Organization"
            };

            // 3. Evaluate Active Status
            if (activeOrgSub != null)
            {
                result.IsActive = true;
                result.MaxUsers = activeOrgSub.MaxUsers;
                result.StartDate = activeOrgSub.StartDate;
                result.EndDate = activeOrgSub.EndDate;
                result.PlanName = activeOrgSub.PlanName ?? "Organization Plan";
            }
            else
            {
                result.IsActive = false;
                if (latestOrgSub != null)
                {
                    result.MaxUsers = latestOrgSub.MaxUsers;
                    result.StartDate = latestOrgSub.StartDate;
                    result.EndDate = latestOrgSub.EndDate;
                    result.PlanName = latestOrgSub.PlanName;
                }
                else
                {
                    result.Source = "None";
                }
            }

            // 4. Calculate Current User Count in the organization
            if (organizationId.HasValue && organizationId.Value > 0)
            {
                bool counted = false;
                if (masterContext != null)
                {
                    try
                    {
                        var org = await masterContext.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == organizationId.Value && !o.IsDeleted);
                        if (org != null && !string.IsNullOrWhiteSpace(org.DatabaseName))
                        {
                            var masterConn = masterContext.Database.GetConnectionString() ?? "";
                            var bld = new MySqlConnector.MySqlConnectionStringBuilder(masterConn)
                            {
                                Database = org.DatabaseName
                            };
                            if (!string.IsNullOrWhiteSpace(org.DbHost)) bld.Server = org.DbHost;
                            if (org.DbPort > 0) bld.Port = (uint)org.DbPort;
                            if (!string.IsNullOrWhiteSpace(org.DbUser)) bld.UserID = org.DbUser;
                            if (!string.IsNullOrWhiteSpace(org.DbPassword)) bld.Password = org.DbPassword;

                            using var conn = new MySqlConnector.MySqlConnection(bld.ConnectionString);
                            await conn.OpenAsync();
                            using var cmd = new MySqlConnector.MySqlCommand("SELECT COUNT(*) FROM employees WHERE Status = 'Active';", conn);
                            var countObj = await cmd.ExecuteScalarAsync();
                            result.CurrentUsers = (countObj != null && countObj != DBNull.Value) ? Convert.ToInt32(countObj) : 0;
                            counted = true;
                        }
                    }
                    catch
                    {
                        // Fallback to context
                    }
                }

                if (!counted)
                {
                    try
                    {
                        result.CurrentUsers = await context.Employees
                            .CountAsync(e => e.Status == "Active");
                    }
                    catch
                    {
                        result.CurrentUsers = 0;
                    }
                }
            }

            result.RemainingUsers = Math.Max(0, result.MaxUsers - result.CurrentUsers);
            return result;
        }
    }
}
