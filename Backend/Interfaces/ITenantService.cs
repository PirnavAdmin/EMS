// varsha - Multi-tenant service contract
using EmployeeManagementSystem.Data;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ITenantService
    {
        Task<string?> ResolveOrganizationCodeAsync(ClaimsPrincipal? user);

        string GetTenantConnectionString(string organizationCode);

        Task EnsureTenantDatabaseAndAuditTableAsync(string organizationCode);

        AppDbContext CreateTenantDbContext(string organizationCode);
    }
}
