namespace EmployeeManagementSystem.Interfaces
{
    using System.Security.Claims;

    public interface IPermissionService
    {
        Task<List<object>> GetFinalPermissions(string employeeId);

        Task<bool> HasPermission(
            ClaimsPrincipal user,
            int moduleId,
            string permission);
    }
}
