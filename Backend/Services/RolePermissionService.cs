using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class RolePermissionService : IRolePermissionService
    {
        private readonly AppDbContext _context;

        public RolePermissionService(AppDbContext context)
        {
            _context = context;
        }

        // Save Permissions (RoleName based)
        public async Task SavePermissions(SaveRolePermissionDto dto)
        {
            // Convert RoleName -> RoleId
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

            if (role == null)
                throw new Exception("Invalid Role Name");

            // Remove existing permissions
            var existingPermissions = _context.RolePermissions
                .Where(rp => rp.RoleId == role.RoleId);

            _context.RolePermissions.RemoveRange(existingPermissions);

            var newPermissions = dto.Modules.Select(m => new RolePermission
            {
                RoleId = role.RoleId,
                ModuleId = m.ModuleId,
                CanAccess = m.CanAccess,
                CanView = m.CanView,
                CanAdd = m.CanAdd,
                CanEdit = m.CanEdit,
                CanDelete = m.CanDelete
            });

            await _context.RolePermissions.AddRangeAsync(newPermissions);
            await _context.SaveChangesAsync();
        }

        // Get Permissions (RoleName based)
        public async Task<List<RolePermissionResponseDto>> GetPermissions(string roleName)
        {
            // Convert RoleName -> RoleId
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == roleName);

            if (role == null)
                throw new Exception("Role not found");

            var modules = await _context.Modules.ToListAsync();

            var permissions = await _context.RolePermissions
                .Where(rp => rp.RoleId == role.RoleId)
                .ToListAsync();

            var result = modules.Select(m => new RolePermissionResponseDto
            {
                ModuleId = m.ModuleId,
                ModuleName = m.ModuleName,
                Type = m.Type,
                CanAccess = permissions
                    .FirstOrDefault(p => p.ModuleId == m.ModuleId)?.CanAccess ?? false,
                    CanView = permissions
    .FirstOrDefault(p => p.ModuleId == m.ModuleId)?.CanView ?? false,

                CanAdd = permissions
    .FirstOrDefault(p => p.ModuleId == m.ModuleId)?.CanAdd ?? false,

                CanEdit = permissions
    .FirstOrDefault(p => p.ModuleId == m.ModuleId)?.CanEdit ?? false,

                CanDelete = permissions
    .FirstOrDefault(p => p.ModuleId == m.ModuleId)?.CanDelete ?? false
            }).ToList();

            return result;
        }
        public async Task<List<object>> GetEmployeesByRole(string roleName)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == roleName);

            if (role == null)
                throw new Exception("Role not found");

            var employees = await _context.Employees
                .Where(e => e.RoleId == role.RoleId)
                .Select(e => new
                {
                    e.Employee_Id,
                    EmployeeName = e.Name, // or e.EmployeeName
                    Role = role.Name,
                    e.Status
                })
                .OrderBy(e => e.Employee_Id)
                .ToListAsync();

            return employees.Cast<object>().ToList();
        }
        // Get Allowed Modules for Logged-in User
        public async Task<List<object>> GetAllowedModules(int roleId)
        {
            var data = await _context.RolePermissions
                .Include(rp => rp.Module)
                .Where(rp => rp.RoleId == roleId &&
                             rp.CanAccess &&
                             rp.CanView)
                .Select(rp => new
                {
                    rp.Module.ModuleId,
                    rp.Module.ModuleName,
                    rp.Module.Type,

                    rp.CanAccess,
                    rp.CanView,
                    rp.CanAdd,
                    rp.CanEdit,
                    rp.CanDelete
                })
                .ToListAsync();

            return data.Cast<object>().ToList();
        }
    }
}