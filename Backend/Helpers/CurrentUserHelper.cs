using System.Security.Claims;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Helpers
{
    public static class CurrentUserHelper
    {
        public static string? GetEmployeeOrOnboardingId(ClaimsPrincipal user)
        {
            return user.FindFirst("EmployeeId")?.Value
                ?? user.FindFirst("OnboardingId")?.Value;
        }

        public static string? GetEmployeeId(ClaimsPrincipal user)
        {
            return user.FindFirst("EmployeeId")?.Value;
        }

        public static string? GetOnboardingId(ClaimsPrincipal user)
        {
            return user.FindFirst("OnboardingId")?.Value;
        }

        public static int? GetOrganizationId(ClaimsPrincipal user)
        {
            var claim = user.FindFirst("OrganizationId")?.Value;
            return int.TryParse(claim, out int orgId) ? orgId : null;
        }

        public static async Task<(int? OrgId, List<int> AdminIds)> GetTenantContextAsync(AppDbContext context, ClaimsPrincipal user)
        {
            var tokenOrgId = GetOrganizationId(user);
            if (tokenOrgId.HasValue && tokenOrgId.Value > 0)
            {
                var orgAdminIds = await context.Admins
                    .AsNoTracking()
                    .Where(a => a.OrganizationId == tokenOrgId.Value)
                    .Select(a => a.Id)
                    .ToListAsync();
                return (tokenOrgId.Value, orgAdminIds);
            }

            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int adminId))
            {
                var admin = await context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId);
                if (admin != null && admin.OrganizationId.HasValue && admin.OrganizationId.Value > 0)
                {
                    var orgAdminIds = await context.Admins
                        .AsNoTracking()
                        .Where(a => a.OrganizationId == admin.OrganizationId.Value)
                        .Select(a => a.Id)
                        .ToListAsync();
                    return (admin.OrganizationId.Value, orgAdminIds);
                }
                return (null, new List<int> { adminId });
            }

            var employeeIdClaim = user.FindFirst("EmployeeId")?.Value;
            if (!string.IsNullOrWhiteSpace(employeeIdClaim))
            {
                var emp = await context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == employeeIdClaim);
                if (emp != null)
                {
                    if (emp.OrganizationId.HasValue && emp.OrganizationId.Value > 0)
                    {
                        var orgAdminIds = await context.Admins
                            .AsNoTracking()
                            .Where(a => a.OrganizationId == emp.OrganizationId.Value)
                            .Select(a => a.Id)
                            .ToListAsync();
                        return (emp.OrganizationId.Value, orgAdminIds);
                    }
                    if (emp.AdminId.HasValue)
                    {
                        return (null, new List<int> { emp.AdminId.Value });
                    }
                }
            }

            var emailClaim = user.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(emailClaim))
            {
                var adminByEmail = await context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Email.ToLower() == emailClaim.ToLower());
                if (adminByEmail != null)
                {
                    if (adminByEmail.OrganizationId.HasValue && adminByEmail.OrganizationId.Value > 0)
                    {
                        var orgAdminIds = await context.Admins
                            .AsNoTracking()
                            .Where(a => a.OrganizationId == adminByEmail.OrganizationId.Value)
                            .Select(a => a.Id)
                            .ToListAsync();
                        return (adminByEmail.OrganizationId.Value, orgAdminIds);
                    }
                    return (null, new List<int> { adminByEmail.Id });
                }

                var empByEmail = await context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Email != null && e.Email.ToLower() == emailClaim.ToLower());
                if (empByEmail != null)
                {
                    if (empByEmail.OrganizationId.HasValue && empByEmail.OrganizationId.Value > 0)
                    {
                        var orgAdminIds = await context.Admins
                            .AsNoTracking()
                            .Where(a => a.OrganizationId == empByEmail.OrganizationId.Value)
                            .Select(a => a.Id)
                            .ToListAsync();
                        return (empByEmail.OrganizationId.Value, orgAdminIds);
                    }
                    if (empByEmail.AdminId.HasValue)
                    {
                        return (null, new List<int> { empByEmail.AdminId.Value });
                    }
                }
            }

            return (null, new List<int>());
        }

        public static IQueryable<Employee> FilterEmployeesByTenant(AppDbContext context, int? orgId, List<int> adminIds)
        {
            if (orgId.HasValue && orgId.Value > 0)
            {
                return context.Employees.Where(e => e.OrganizationId == orgId.Value || (e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value)));
            }
            if (adminIds != null && adminIds.Any())
            {
                return context.Employees.Where(e => e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value));
            }
            return context.Employees.Where(e => false);
        }

        public static async Task<bool> IsEmployeeInTenantAsync(AppDbContext context, ClaimsPrincipal user, string employeeId)
        {
            if (string.IsNullOrWhiteSpace(employeeId)) return false;
            var (orgId, adminIds) = await GetTenantContextAsync(context, user);
            return await FilterEmployeesByTenant(context, orgId, adminIds)
                .AnyAsync(e => e.Employee_Id == employeeId.Trim());
        }

        public static async Task<bool> IsAdminUserAsync(AppDbContext context, ClaimsPrincipal user)
        {
            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out _))
                return true;

            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            if (string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase))
                return true;

            var email = user.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrWhiteSpace(email))
            {
                return await context.Admins.AnyAsync(a => a.Email.ToLower() == email.ToLower());
            }

            return false;
        }

        public static async Task<bool> CanAccessOnboardingCandidateAsync(
            AppDbContext context,
            ClaimsPrincipal user,
            string onboardingId)
        {
            if (string.IsNullOrWhiteSpace(onboardingId))
                return false;

            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            if (string.Equals(roleClaim, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
                return true;

            var tokenOnboardingId = GetOnboardingId(user);
            if (!string.IsNullOrWhiteSpace(tokenOnboardingId))
            {
                return string.Equals(tokenOnboardingId, onboardingId.Trim(), StringComparison.OrdinalIgnoreCase);
            }

            var candidate = await context.OnboardingCandidates
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.OnboardingId == onboardingId.Trim());

            if (candidate == null)
                return false;

            var (orgId, adminIds) = await GetTenantContextAsync(context, user);
            if (orgId.HasValue && orgId.Value > 0)
            {
                if (candidate.OrganizationId.HasValue)
                {
                    return candidate.OrganizationId.Value == orgId.Value;
                }
                return true;
            }
            else if (adminIds != null && adminIds.Any())
            {
                return true;
            }

            return false;
        }

        public static IQueryable<string> GetAllowedOnboardingIds(
            AppDbContext context,
            ClaimsPrincipal user,
            int? orgId)
        {
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            if (string.Equals(roleClaim, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return context.OnboardingCandidates.AsNoTracking().Select(c => c.OnboardingId);
            }

            var tokenOnboardingId = GetOnboardingId(user);
            if (!string.IsNullOrWhiteSpace(tokenOnboardingId))
            {
                return context.OnboardingCandidates
                    .AsNoTracking()
                    .Where(c => c.OnboardingId == tokenOnboardingId)
                    .Select(c => c.OnboardingId);
            }

            var query = context.OnboardingCandidates.AsNoTracking();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(c => c.OrganizationId == orgId.Value);
            }
            return query.Select(c => c.OnboardingId);
        }
    }
}
