using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using OpenXmlPowerTools;

namespace EmployeeManagementSystem.Services
{
    public class UserPermissionService : IUserPermissionService
    {
        private readonly AppDbContext _context;

        public UserPermissionService(AppDbContext context)
        {
            _context = context;
        }
        public async Task SavePermissions(SaveUserPermissionDto dto)
        {
            // =====================================================
            // 1. GET EMPLOYEE
            // =====================================================

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == dto.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            if (!employee.AdminId.HasValue)
                throw new Exception(
                    "AdminId is not assigned to this employee.");

            if (!employee.RoleId.HasValue)
                throw new Exception(
                    "RoleId is not assigned to this employee.");

            int adminId = employee.AdminId.Value;
            int roleId = employee.RoleId.Value;


            // =====================================================
            // 2. GET ADMIN ALLOWED PERMISSIONS
            // SuperAdmin -> Admin
            // =====================================================

            var adminPermissions =
                await _context.AdminPermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.AdminId == adminId &&
                        x.CanAccess)
                    .ToListAsync();

            if (!adminPermissions.Any())
                throw new Exception(
                    "No modules are assigned to this Admin.");


            // =====================================================
            // 3. GET ROLE PERMISSIONS
            // Admin -> Role
            // =====================================================

            var rolePermissions =
                await _context.RolePermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.RoleId == roleId &&
                        x.CanAccess)
                    .ToListAsync();


            // =====================================================
            // 4. VALIDATE USER REQUEST
            // =====================================================

            foreach (var module in dto.Modules)
            {
                // -----------------------------
                // Check Admin permission
                // -----------------------------

                var adminPermission =
                    adminPermissions.FirstOrDefault(x =>
                        x.ModuleId == module.ModuleId);

                if (adminPermission == null)
                {
                    throw new Exception(
                        $"Module {module.ModuleId} is not allowed for this Admin.");
                }


                // -----------------------------
                // Check Role permission
                // -----------------------------

                var rolePermission =
                    rolePermissions.FirstOrDefault(x =>
                        x.ModuleId == module.ModuleId);

                if (rolePermission == null)
                {
                    throw new Exception(
                        $"Module {module.ModuleId} is not allowed for this employee's role.");
                }


                // =================================================
                // USER CANNOT EXCEED ROLE PERMISSIONS
                // =================================================

                if (module.CanView &&
                    !rolePermission.CanView)
                {
                    throw new Exception(
                        $"View permission is not allowed for module {module.ModuleId}.");
                }

                if (module.CanAdd &&
                    !rolePermission.CanAdd)
                {
                    throw new Exception(
                        $"Add permission is not allowed for module {module.ModuleId}.");
                }

                if (module.CanEdit &&
                    !rolePermission.CanEdit)
                {
                    throw new Exception(
                        $"Edit permission is not allowed for module {module.ModuleId}.");
                }

                if (module.CanDelete &&
                    !rolePermission.CanDelete)
                {
                    throw new Exception(
                        $"Delete permission is not allowed for module {module.ModuleId}.");
                }
            }


            // =====================================================
            // 5. REMOVE OLD USER OVERRIDES
            // =====================================================

            var existing =
                await _context.UserPermissions
                    .Where(x =>
                        x.EmployeeId == dto.EmployeeId)
                    .ToListAsync();

            if (existing.Any())
            {
                _context.UserPermissions
                    .RemoveRange(existing);
            }


            // =====================================================
            // 6. CREATE USER OVERRIDES
            // =====================================================

            var list = dto.Modules
                .Select(x => new UserPermission
                {
                    EmployeeId = dto.EmployeeId,

                    ModuleId = x.ModuleId,

                    // automatically calculate
                    CanAccess =
                        x.CanView ||
                        x.CanAdd ||
                        x.CanEdit ||
                        x.CanDelete,

                    CanView = x.CanView,
                    CanAdd = x.CanAdd,
                    CanEdit = x.CanEdit,
                    CanDelete = x.CanDelete,

                    CreatedAt = DateTime.UtcNow
                })
                .ToList();


            // =====================================================
            // 7. SAVE
            // =====================================================

            await _context.UserPermissions
                .AddRangeAsync(list);

            await _context.SaveChangesAsync();
        }
        public async Task<List<RolePermissionResponseDto>>
       GetPermissions(string employeeId)
        {
            // =====================================================
            // 1. EMPLOYEE
            // =====================================================

            var employee =
                await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            if (!employee.AdminId.HasValue)
                throw new Exception(
                    "AdminId is not assigned to employee.");

            if (!employee.RoleId.HasValue)
                throw new Exception(
                    "RoleId is not assigned to employee.");


            int adminId = employee.AdminId.Value;
            int roleId = employee.RoleId.Value;


            // =====================================================
            // 2. ADMIN ALLOWED MODULES
            // =====================================================

            var adminAllowedModuleIds =
                await _context.AdminPermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.AdminId == adminId &&
                        x.CanAccess)
                    .Select(x => x.ModuleId)
                    .ToListAsync();


            // =====================================================
            // 3. ROLE PERMISSIONS
            // =====================================================

            var rolePermissions =
                await _context.RolePermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.RoleId == roleId &&
                        x.CanAccess &&
                        adminAllowedModuleIds.Contains(
                            x.ModuleId))
                    .ToListAsync();


            var roleModuleIds =
                rolePermissions
                    .Select(x => x.ModuleId)
                    .ToList();


            // =====================================================
            // 4. LOAD ONLY ROLE ALLOWED MODULES
            // =====================================================

            var modules =
                await _context.Modules
                    .AsNoTracking()
                    .Where(x =>
                        roleModuleIds.Contains(x.ModuleId))
                    .OrderBy(x => x.ModuleId)
                    .ToListAsync();


            // =====================================================
            // 5. USER OVERRIDES
            // =====================================================

            var userPermissions =
                await _context.UserPermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.EmployeeId == employeeId &&
                        roleModuleIds.Contains(
                            x.ModuleId))
                    .ToListAsync();


            // =====================================================
            // 6. MERGE ROLE + USER
            // =====================================================

            var result = modules.Select(module =>
            {
                var rolePermission =
                    rolePermissions.First(x =>
                        x.ModuleId == module.ModuleId);

                var userPermission =
                    userPermissions.FirstOrDefault(x =>
                        x.ModuleId == module.ModuleId);


                return new RolePermissionResponseDto
                {
                    ModuleId = module.ModuleId,

                    ModuleName = module.ModuleName,

                    Type = module.Type,

                    // USER OVERRIDE
                    // otherwise ROLE permission

                    CanAccess =
                        userPermission?.CanAccess
                        ?? rolePermission.CanAccess,

                    CanView =
                        userPermission?.CanView
                        ?? rolePermission.CanView,

                    CanAdd =
                        userPermission?.CanAdd
                        ?? rolePermission.CanAdd,

                    CanEdit =
                        userPermission?.CanEdit
                        ?? rolePermission.CanEdit,

                    CanDelete =
                        userPermission?.CanDelete
                        ?? rolePermission.CanDelete
                };

            }).ToList();


            return result;
        }
        public async Task<List<object>>
         GetAllowedModules(string employeeId)
        {
            // =====================================================
            // 1. EMPLOYEE
            // =====================================================

            var employee =
                await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId);

            if (employee == null)
                return new List<object>();

            if (!employee.AdminId.HasValue ||
                !employee.RoleId.HasValue)
            {
                return new List<object>();
            }


            int adminId = employee.AdminId.Value;
            int roleId = employee.RoleId.Value;


            // =====================================================
            // 2. ADMIN ALLOWED MODULES
            // =====================================================

            var adminAllowedModuleIds =
                await _context.AdminPermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.AdminId == adminId &&
                        x.CanAccess)
                    .Select(x => x.ModuleId)
                    .ToListAsync();


            if (!adminAllowedModuleIds.Any())
                return new List<object>();


            // =====================================================
            // 3. ROLE ALLOWED MODULES
            // =====================================================

            var rolePermissions =
                await _context.RolePermissions
                    .AsNoTracking()
                    .Include(x => x.Module)
                    .Where(x =>
                        x.RoleId == roleId &&

                        adminAllowedModuleIds.Contains(
                            x.ModuleId) &&

                        x.CanAccess)
                    .ToListAsync();


            if (!rolePermissions.Any())
                return new List<object>();


            var roleModuleIds =
                rolePermissions
                    .Select(x => x.ModuleId)
                    .ToList();


            // =====================================================
            // 4. USER OVERRIDES
            // ONLY FOR ROLE ALLOWED MODULES
            // =====================================================

            var userPermissions =
                await _context.UserPermissions
                    .AsNoTracking()
                    .Where(x =>
                        x.EmployeeId == employeeId &&

                        roleModuleIds.Contains(
                            x.ModuleId))
                    .ToListAsync();


            // =====================================================
            // 5. MERGE
            // =====================================================

            var result = new List<object>();


            foreach (var rolePermission in rolePermissions)
            {
                var userPermission =
                    userPermissions.FirstOrDefault(x =>
                        x.ModuleId ==
                        rolePermission.ModuleId);


                // USER OVERRIDE
                // otherwise ROLE
                bool canAccess =
                    userPermission?.CanAccess
                    ?? rolePermission.CanAccess;


                // If user explicitly disabled module
                if (!canAccess)
                    continue;


                result.Add(new
                {
                    ModuleId =
                        rolePermission.ModuleId,

                    ModuleName =
                        rolePermission.Module.ModuleName,

                    CanAccess = canAccess,

                    CanView =
                        userPermission?.CanView
                        ?? rolePermission.CanView,

                    CanAdd =
                        userPermission?.CanAdd
                        ?? rolePermission.CanAdd,

                    CanEdit =
                        userPermission?.CanEdit
                        ?? rolePermission.CanEdit,

                    CanDelete =
                        userPermission?.CanDelete
                        ?? rolePermission.CanDelete
                });
            }


            return result;
        }
    }
}