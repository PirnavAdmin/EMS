using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class RolePermissionService : IRolePermissionService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RolePermissionService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        // Save Permissions (RoleName based)
        public async Task SavePermissions(
     int adminId,
     SaveRolePermissionDto dto)
        {
            // =====================================================
            // 1. VALIDATE ADMIN & ORG
            // =====================================================

            var admin = await _context.Admins
                .FirstOrDefaultAsync(a => a.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            var orgId = admin.OrganizationId;


            // =====================================================
            // 2. GET ROLE
            // =====================================================

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

            if (role == null)
                throw new Exception("Invalid Role Name");


            // =====================================================
            // 3. GET MODULES ALLOWED BY SUPERADMIN
            // =====================================================

            var adminAllowedPermissions = await _context.AdminPermissions
                .AsNoTracking()
                .Where(x =>
                    x.AdminId == adminId &&
                    x.CanAccess)
                .ToListAsync();

            if (!adminAllowedPermissions.Any())
                throw new Exception(
                    "No modules are assigned to this Admin by SuperAdmin.");


            // =====================================================
            // 4. VALIDATE REQUESTED MODULES
            // =====================================================

            foreach (var module in dto.Modules)
            {
                var adminPermission = adminAllowedPermissions
                    .FirstOrDefault(x =>
                        x.ModuleId == module.ModuleId);

                if (adminPermission == null)
                {
                    throw new Exception(
                        $"Module {module.ModuleId} is not allowed for this Admin.");
                }


                // Admin cannot give VIEW if SuperAdmin didn't give VIEW
                if (module.CanView &&
                    !adminPermission.CanView)
                {
                    throw new Exception(
                        $"View permission is not allowed for module {module.ModuleId}.");
                }


                // Admin cannot give ADD if SuperAdmin didn't give ADD
                if (module.CanAdd &&
                    !adminPermission.CanAdd)
                {
                    throw new Exception(
                        $"Add permission is not allowed for module {module.ModuleId}.");
                }


                // Admin cannot give EDIT if SuperAdmin didn't give EDIT
                if (module.CanEdit &&
                    !adminPermission.CanEdit)
                {
                    throw new Exception(
                        $"Edit permission is not allowed for module {module.ModuleId}.");
                }


                // Admin cannot give DELETE if SuperAdmin didn't give DELETE
                if (module.CanDelete &&
                    !adminPermission.CanDelete)
                {
                    throw new Exception(
                        $"Delete permission is not allowed for module {module.ModuleId}.");
                }
            }


            // =====================================================
            // 5. REMOVE EXISTING ROLE PERMISSIONS
            // ONLY FOR MODULES CONTROLLED BY THIS ADMIN
            // =====================================================

            var allowedModuleIds = adminAllowedPermissions
                .Select(x => x.ModuleId)
                .ToList();


            var existingPermissions = await _context.RolePermissions
                .Where(rp =>
                    rp.RoleId == role.RoleId &&
                    (!orgId.HasValue || rp.OrganizationId == orgId.Value) &&
                    allowedModuleIds.Contains(rp.ModuleId))
                .ToListAsync();


            if (existingPermissions.Any())
            {
                _context.RolePermissions
                    .RemoveRange(existingPermissions);
            }


            // =====================================================
            // 6. SAVE NEW ROLE PERMISSIONS
            // =====================================================
            var newPermissions = dto.Modules
                .Select(m => new RolePermission
                {
                    RoleId = role.RoleId,
                    OrganizationId = orgId,
                    ModuleId = m.ModuleId,

                    // Automatically allow module if ANY permission is given
                    CanAccess =
                        m.CanView ||
                        m.CanAdd ||
                        m.CanEdit ||
                        m.CanDelete,

                    CanView = m.CanView,
                    CanAdd = m.CanAdd,
                    CanEdit = m.CanEdit,
                    CanDelete = m.CanDelete
                })
                .ToList();


            await _context.RolePermissions
                .AddRangeAsync(newPermissions);


            await _context.SaveChangesAsync();
        }
        // Get Permissions (RoleName based)
        public async Task<List<RolePermissionResponseDto>> GetPermissions(
       int adminId,
       string roleName)
        {
            // =====================================================
            // 1. VALIDATE ADMIN
            // =====================================================

            var admin = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            var orgId = admin.OrganizationId;


            // =====================================================
            // 2. GET ROLE
            // =====================================================

            var role = await _context.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.Name == roleName);

            if (role == null)
                throw new Exception("Role not found");


            // =====================================================
            // 3. GET MODULES GIVEN TO ADMIN BY SUPERADMIN
            // =====================================================

            var adminPermissions = await _context.AdminPermissions
                .AsNoTracking()
                .Where(ap =>
                    ap.AdminId == adminId &&
                    ap.CanAccess)
                .ToListAsync();


            var allowedModuleIds = adminPermissions
                .Select(x => x.ModuleId)
                .ToList();


            // =====================================================
            // 4. GET ONLY ALLOWED MODULE DETAILS
            // =====================================================

            var modules = await _context.Modules
                .AsNoTracking()
                .Where(m =>
                    allowedModuleIds.Contains(m.ModuleId))
                .OrderBy(m => m.ModuleId)
                .ToListAsync();


            // =====================================================
            // 5. GET ROLE PERMISSIONS (TENANT SPECIFIC WITH DEFAULT FALLBACK)
            // =====================================================

            var rolePermissionsQuery = _context.RolePermissions
                .AsNoTracking()
                .Where(rp =>
                    rp.RoleId == role.RoleId &&
                    allowedModuleIds.Contains(rp.ModuleId));

            List<RolePermission> rolePermissions;
            if (orgId.HasValue)
            {
                var tenantPermissions = await rolePermissionsQuery
                    .Where(rp => rp.OrganizationId == orgId.Value)
                    .ToListAsync();

                if (!tenantPermissions.Any())
                {
                    tenantPermissions = await rolePermissionsQuery
                        .Where(rp => rp.OrganizationId == null)
                        .ToListAsync();
                }
                rolePermissions = tenantPermissions;
            }
            else
            {
                rolePermissions = await rolePermissionsQuery
                    .Where(rp => rp.OrganizationId == null)
                    .ToListAsync();
            }


            // =====================================================
            // 6. MERGE
            // =====================================================

            var result = modules.Select(module =>
            {
                var rolePermission = rolePermissions
                    .FirstOrDefault(p =>
                        p.ModuleId == module.ModuleId);

                var adminPermission = adminPermissions
                    .First(p =>
                        p.ModuleId == module.ModuleId);


                return new RolePermissionResponseDto
                {
                    ModuleId = module.ModuleId,

                    ModuleName = module.ModuleName,

                    Type = module.Type,


                    // ROLE'S CURRENT PERMISSIONS

                    CanAccess =
                        rolePermission?.CanAccess ?? false,

                    CanView =
                        rolePermission?.CanView ?? false,

                    CanAdd =
                        rolePermission?.CanAdd ?? false,

                    CanEdit =
                        rolePermission?.CanEdit ?? false,

                    CanDelete =
                        rolePermission?.CanDelete ?? false
                };
            })
            .ToList();


            return result;
        }
        public async Task<List<object>> GetEmployeesByRole(string roleName)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == roleName);

            if (role == null)
                throw new Exception("Role not found");

            var tenantEmployees = CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds);

            var employees = await tenantEmployees
                .Where(e => e.RoleId == role.RoleId)
                .Select(e => new
                {
                    e.Employee_Id,
                    EmployeeName = e.Name,
                    Role = role.Name,
                    e.Status
                })
                .OrderBy(e => e.Employee_Id)
                .ToListAsync();

            return employees.Cast<object>().ToList();
        }
        // Get Allowed Modules for Logged-in User
        public async Task<List<object>> GetAllowedModules(
       int adminId,
       int roleId)
        {
            // ============================================
            // 1. GET MODULES ALLOWED TO ADMIN
            // ============================================

            var admin = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == adminId);

            var orgId = admin?.OrganizationId;

            var adminAllowedModuleIds =
                await _context.AdminPermissions
                    .AsNoTracking()
                    .Where(ap =>
                        ap.AdminId == adminId &&
                        ap.CanAccess)
                    .Select(ap => ap.ModuleId)
                    .ToListAsync();

            if (!adminAllowedModuleIds.Any())
            {
                return new List<object>();
            }


            // ============================================
            // 2. GET ROLE PERMISSIONS (TENANT SPECIFIC WITH DEFAULT FALLBACK)
            // ============================================

            var rolePermissionsQuery = _context.RolePermissions
                .AsNoTracking()
                .Include(rp => rp.Module)
                .Where(rp =>
                    rp.RoleId == roleId &&
                    adminAllowedModuleIds.Contains(rp.ModuleId) &&
                    rp.CanAccess);

            List<RolePermission> dataList;
            if (orgId.HasValue)
            {
                var tenantPermissions = await rolePermissionsQuery
                    .Where(rp => rp.OrganizationId == orgId.Value)
                    .ToListAsync();

                if (!tenantPermissions.Any())
                {
                    tenantPermissions = await rolePermissionsQuery
                        .Where(rp => rp.OrganizationId == null)
                        .ToListAsync();
                }
                dataList = tenantPermissions;
            }
            else
            {
                dataList = await rolePermissionsQuery
                    .Where(rp => rp.OrganizationId == null)
                    .ToListAsync();
            }

            var data = dataList
                .Select(rp => new
                {
                    ModuleId = rp.Module.ModuleId,
                    ModuleName = rp.Module.ModuleName,
                    CanAccess = rp.CanAccess,
                    CanView = rp.CanView,
                    CanAdd = rp.CanAdd,
                    CanEdit = rp.CanEdit,
                    CanDelete = rp.CanDelete
                })
                .OrderBy(x => x.ModuleId)
                .ToList();

            return data.Cast<object>().ToList();
        }
    }
}