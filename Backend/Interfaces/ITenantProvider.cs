namespace EmployeeManagementSystem.Interfaces
{
    public interface ITenantProvider
    {
        string? GetCurrentOrganizationCode();
        string GetTenantConnectionString();
        void SetCurrentTenant(string organizationCode);
    }
}
