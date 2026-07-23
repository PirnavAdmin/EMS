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
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            var existing = await _context.UserPermissions
                .Where(x => x.EmployeeId == dto.EmployeeId)
                .ToListAsync();

            _context.UserPermissions.RemoveRange(existing);

            await _context.SaveChangesAsync();

            var list = dto.Modules.Select(x => new UserPermission
            {
                EmployeeId = dto.EmployeeId,
                ModuleId = x.ModuleId,
                CanAccess = x.CanAccess,
                CanView = x.CanView,
                CanAdd = x.CanAdd,
                CanEdit = x.CanEdit,
                CanDelete = x.CanDelete,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await _context.UserPermissions.AddRangeAsync(list);

            await _context.SaveChangesAsync();
        }
        public async Task<List<RolePermissionResponseDto>> GetPermissions(string employeeId)
        {
            // Get Employee
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            // Load All Modules
            var modules = await _context.Modules
                .OrderBy(x => x.ModuleId)
                .ToListAsync();

            // Load Role Permissions
            var rolePermissions = await _context.RolePermissions
                .Where(x => x.RoleId == employee.RoleId)
                .ToListAsync();

            // Load User Permissions
            var userPermissions = await _context.UserPermissions
                .Where(x => x.EmployeeId == employeeId)
                .ToListAsync();

            var result = modules.Select(m =>
            {
                var rolePermission = rolePermissions
                    .FirstOrDefault(r => r.ModuleId == m.ModuleId);

                var userPermission = userPermissions
                    .FirstOrDefault(u => u.ModuleId == m.ModuleId);

                return new RolePermissionResponseDto
                {
                    ModuleId = m.ModuleId,
                    ModuleName = m.ModuleName,
                    Type = m.Type,

                    CanAccess = userPermission?.CanAccess ?? rolePermission?.CanAccess ?? false,
                    CanView = userPermission?.CanView ?? rolePermission?.CanView ?? false,
                    CanAdd = userPermission?.CanAdd ?? rolePermission?.CanAdd ?? false,
                    CanEdit = userPermission?.CanEdit ?? rolePermission?.CanEdit ?? false,
                    CanDelete = userPermission?.CanDelete ?? rolePermission?.CanDelete ?? false
                };
            }).ToList();

            return result;
        }
        public async Task<List<object>> GetAllowedModules(string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (employee == null)
                return new List<object>();

            var rolePermissions = await _context.RolePermissions
                .Include(x => x.Module)
                .Where(x => x.RoleId == employee.RoleId)
                .ToListAsync();

            var userPermissions = await _context.UserPermissions
                .Include(x => x.Module)
                .Where(x => x.EmployeeId == employeeId)
                .ToListAsync();

            var result = new List<object>();

            foreach (var rp in rolePermissions)
            {
                var up = userPermissions.FirstOrDefault(x => x.ModuleId == rp.ModuleId);

                bool canAccess = up?.CanAccess ?? rp.CanAccess;

                if (!canAccess)
                    continue;

                result.Add(new
                {
                    ModuleId = rp.ModuleId,
                    ModuleName = rp.Module.ModuleName,
                    Type = rp.Module.Type,

                    CanAccess = canAccess,
                    CanView = up?.CanView ?? rp.CanView,
                    CanAdd = up?.CanAdd ?? rp.CanAdd,
                    CanEdit = up?.CanEdit ?? rp.CanEdit,
                    CanDelete = up?.CanDelete ?? rp.CanDelete
                });
            }

            foreach (var up in userPermissions)
            {
                if (!rolePermissions.Any(r => r.ModuleId == up.ModuleId) && up.CanAccess)
                {
                    result.Add(new
                    {
                        ModuleId = up.ModuleId,
                        ModuleName = up.Module.ModuleName,
                        Type = up.Module.Type,

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
    }
}