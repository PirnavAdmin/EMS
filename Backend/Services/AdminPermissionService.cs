// varsha - Admin permission service managing module permissions and Audit Logs access control
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class AdminPermissionService : IAdminPermissionService
    {
        private readonly AppDbContext _context;

        public AdminPermissionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> SavePermissions(SaveAdminPermissionDto dto)
        {
            if (dto == null)
                throw new ArgumentException("Request body cannot be null.");

            if (dto.Modules == null || dto.Modules.Count == 0)
                throw new ArgumentException("Modules cannot be null or empty.");

            // Check Admin
            var adminExists = await _context.Admins
                .AnyAsync(x => x.Id == dto.AdminId);

            if (!adminExists)
                return "Admin not found.";

            // Remove old permissions
            var oldPermissions = await _context.AdminPermissions
                .Where(x => x.AdminId == dto.AdminId)
                .ToListAsync();

            if (oldPermissions.Any())
            {
                _context.AdminPermissions.RemoveRange(oldPermissions);
            }

            // Add new permissions
            foreach (var module in dto.Modules)
            {
                _context.AdminPermissions.Add(new AdminPermission
                {
                    AdminId = dto.AdminId,
                    ModuleId = module.ModuleId,
                    CanView = module.CanView,
                    CanAdd = module.CanAdd,
                    CanEdit = module.CanEdit,
                    CanDelete = module.CanDelete,
                    CanAccess = module.CanAccess
                });
            }

            await _context.SaveChangesAsync();

            return "Permissions saved successfully.";
        }

        public async Task<object> GetAllowedModules(int adminId)
        {
            var admin = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            var allowedModules = await (
                from permission in _context.AdminPermissions.AsNoTracking()

                join module in _context.Modules.AsNoTracking()
                    on permission.ModuleId equals module.ModuleId

                where permission.AdminId == adminId
                      && permission.CanAccess == true

                orderby module.ModuleId

                select new
                {
                    ModuleId = module.ModuleId,
                    ModuleName = module.ModuleName,

                    CanAccess = permission.CanAccess,
                    CanView = permission.CanView,
                    CanAdd = permission.CanAdd,
                    CanEdit = permission.CanEdit,
                    CanDelete = permission.CanDelete
                }
            ).ToListAsync();

            return new
            {
                AdminId = admin.Id,
                AdminEmail = admin.Email,
                Modules = allowedModules
            };
        }

        public async Task<object> GetPermissions(int adminId)
        {
            // 1. Check Admin exists
            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
                throw new Exception("Admin not found.");

            await GetOrCreateAuditLogsModuleIdAsync();

            // 2. Get ALL modules
            var modules = await _context.Modules
                .AsNoTracking()
                .OrderBy(m => m.ModuleId)
                .ToListAsync();

            // 3. Get permissions already saved for this Admin
            var permissions = await _context.AdminPermissions
                .AsNoTracking()
                .Where(x => x.AdminId == adminId)
                .ToListAsync();

            // 4. Merge modules + permissions
            var result = modules.Select(module =>
            {
                var permission = permissions
                    .FirstOrDefault(p => p.ModuleId == module.ModuleId);

                return new
                {
                    ModuleId = module.ModuleId,
                    ModuleName = module.ModuleName,
                    Type = module.Type,

                    CanAccess = permission?.CanAccess ?? false,
                    CanView = permission?.CanView ?? false,
                    CanAdd = permission?.CanAdd ?? false,
                    CanEdit = permission?.CanEdit ?? false,
                    CanDelete = permission?.CanDelete ?? false
                };
            }).ToList();

            return new
            {
                AdminId = adminId,
                AdminEmail = admin.Email,
                Modules = result
            };
        }

        // varsha - Check if Admin has permission to access Audit Logs
        public async Task<bool> HasAuditLogsPermissionAsync(int adminId)
        {
            if (adminId <= 0) return false;

            // Match by module name "Audit Logs" or constant ModuleIds.AuditLogs
            var auditModule = await _context.Modules.AsNoTracking()
                .FirstOrDefaultAsync(m => m.ModuleName == "Audit Logs" || m.ModuleName == "AuditLogs" || m.ModuleId == ModuleIds.AuditLogs);

            int moduleId = auditModule?.ModuleId ?? ModuleIds.AuditLogs;

            var permission = await _context.AdminPermissions.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AdminId == adminId && p.ModuleId == moduleId);

            // Access granted only if record explicitly exists and CanAccess is true
            return permission != null && permission.CanAccess;
        }

        // varsha - Super Admin grant or revoke Audit Logs permission for a specific Organization Admin
        public async Task<bool> SetAuditLogsPermissionAsync(int adminId, bool canAccess)
        {
            var admin = await _context.Admins.FirstOrDefaultAsync(x => x.Id == adminId);
            if (admin == null)
                throw new Exception($"Admin with ID {adminId} not found.");

            int moduleId = await GetOrCreateAuditLogsModuleIdAsync();

            var permission = await _context.AdminPermissions
                .FirstOrDefaultAsync(p => p.AdminId == adminId && p.ModuleId == moduleId);

            if (permission == null)
            {
                _context.AdminPermissions.Add(new AdminPermission
                {
                    AdminId = adminId,
                    ModuleId = moduleId,
                    CanAccess = canAccess,
                    CanView = canAccess,
                    CanAdd = false,
                    CanEdit = false,
                    CanDelete = false
                });
            }
            else
            {
                permission.CanAccess = canAccess;
                permission.CanView = canAccess;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // varsha - Get current Audit Logs permission status for an Admin
        public async Task<AdminAuditLogsPermissionStatusDto> GetAuditLogsPermissionStatusAsync(int adminId)
        {
            var admin = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(x => x.Id == adminId);
            if (admin == null)
                throw new Exception($"Admin with ID {adminId} not found.");

            bool hasPermission = await HasAuditLogsPermissionAsync(adminId);
            return new AdminAuditLogsPermissionStatusDto
            {
                AdminId = admin.Id,
                AdminEmail = admin.Email,
                HasAuditLogsPermission = hasPermission
            };
        }

        // varsha - Ensure Audit Logs module exists in master database
        private async Task<int> GetOrCreateAuditLogsModuleIdAsync()
        {
            try
            {
                var module = await _context.Modules
                    .FirstOrDefaultAsync(m => m.ModuleName == "Audit Logs" || m.ModuleName == "AuditLogs" || m.ModuleId == ModuleIds.AuditLogs);

                if (module == null)
                {
                    module = new Module
                    {
                        ModuleId = ModuleIds.AuditLogs,
                        ModuleName = "Audit Logs",
                        Type = "Admin"
                    };
                    _context.Modules.Add(module);
                    await _context.SaveChangesAsync();
                }

                return module.ModuleId;
            }
            catch
            {
                // Fallback safe: re-check if already inserted by concurrency
                var existing = await _context.Modules.AsNoTracking().FirstOrDefaultAsync(m => m.ModuleName == "Audit Logs" || m.ModuleId == ModuleIds.AuditLogs);
                return existing?.ModuleId ?? ModuleIds.AuditLogs;
            }
        }
    }
}
