using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly AppDbContext _context;
        private readonly MasterDbContext _masterDb;

        public PermissionService(AppDbContext context, MasterDbContext masterDb)
        {
            _context = context;
            _masterDb = masterDb;
        }

        public async Task<List<object>> GetFinalPermissions(string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                return new List<object>();

            // Default Role Permissions
            var rolePermissions = await _context.RolePermissions
                .Include(r => r.Module)
                .Where(r => r.RoleId == employee.RoleId)
                .ToListAsync();

            // User Overrides
            var userPermissions = await _context.UserPermissions
                .Include(u => u.Module)
                .Where(u => u.EmployeeId == employeeId)
                .ToListAsync();

            var result = new List<object>();

            // Merge Role + User Permissions
            foreach (var rp in rolePermissions)
            {
                var up = userPermissions.FirstOrDefault(x => x.ModuleId == rp.ModuleId);

                result.Add(new
                {
                    ModuleId = rp.ModuleId,
                    ModuleName = rp.Module?.ModuleName,
                    Type = rp.Module?.Type,

                    CanAccess = up?.CanAccess ?? rp.CanAccess,
                    CanView = up?.CanView ?? rp.CanView,
                    CanAdd = up?.CanAdd ?? rp.CanAdd,
                    CanEdit = up?.CanEdit ?? rp.CanEdit,
                    CanDelete = up?.CanDelete ?? rp.CanDelete
                });
            }

            // User-only modules
            foreach (var up in userPermissions)
            {
                if (!rolePermissions.Any(r => r.ModuleId == up.ModuleId))
                {
                    result.Add(new
                    {
                        ModuleId = up.ModuleId,
                        ModuleName = up.Module?.ModuleName,
                        Type = up.Module?.Type,

                        CanAccess = up.CanAccess,
                        CanView = up.CanView,
                        CanAdd = up.CanAdd,
                        CanEdit = up.CanEdit,
                        CanDelete = up.CanDelete
                    });
                }
            }

            return result;
        }

        public async Task<bool> HasPermission(
            ClaimsPrincipal user,
            int moduleId,
            string permission)
        {
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value
                            ?? user.FindFirst("role")?.Value;

            // 1. SuperAdmin has unrestricted access
            if (string.Equals(roleClaim, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
                user.HasClaim(c => c.Type == "SuperAdminId"))
            {
                return true;
            }

            // 2. Admin Permission Check
            if (string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                var adminIdClaim = user.FindFirst("AdminId")?.Value;
                if (!int.TryParse(adminIdClaim, out int adminId) || adminId <= 0)
                {
                    return false;
                }

                var adminPerm = await _context.AdminPermissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.AdminId == adminId && p.ModuleId == moduleId)
                    ?? await _masterDb.AdminPermissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.AdminId == adminId && p.ModuleId == moduleId);

                if (adminPerm == null || !adminPerm.CanAccess)
                    return false;

                permission = permission.Trim().ToLower();
                return permission switch
                {
                    "view" => adminPerm.CanView,
                    "add" => adminPerm.CanAdd,
                    "edit" => adminPerm.CanEdit,
                    "delete" => adminPerm.CanDelete,
                    _ => adminPerm.CanAccess
                };
            }

            // 3. Employee Permission Check
            var email = user.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrWhiteSpace(email))
                return false;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == email);

            if (employee == null)
                return false;

            // Get merged permission
            var rolePermission = await _context.RolePermissions
                .FirstOrDefaultAsync(x =>
                    x.RoleId == employee.RoleId &&
                    x.ModuleId == moduleId);

            var userPermission = await _context.UserPermissions
                .FirstOrDefaultAsync(x =>
                    x.EmployeeId == employee.Employee_Id &&
                    x.ModuleId == moduleId);

            bool canAccess = userPermission?.CanAccess ?? rolePermission?.CanAccess ?? false;
            bool canView = userPermission?.CanView ?? rolePermission?.CanView ?? false;
            bool canAdd = userPermission?.CanAdd ?? rolePermission?.CanAdd ?? false;
            bool canEdit = userPermission?.CanEdit ?? rolePermission?.CanEdit ?? false;
            bool canDelete = userPermission?.CanDelete ?? rolePermission?.CanDelete ?? false;

            if (!canAccess)
                return false;

            permission = permission.Trim().ToLower();

            return permission switch
            {
                "view" => canView,
                "add" => canAdd,
                "edit" => canEdit,
                "delete" => canDelete,
                _ => false
            };
        }
    }
}