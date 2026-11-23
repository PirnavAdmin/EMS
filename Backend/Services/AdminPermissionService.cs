using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Models.Master;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace EmployeeManagementSystem.Services
{
    public class AdminPermissionService : IAdminPermissionService
    {
        private readonly AppDbContext _context;
        private readonly MasterDbContext _masterDb;
        private readonly IConfiguration _configuration;

        public AdminPermissionService(
            AppDbContext context,
            MasterDbContext masterDb,
            IConfiguration configuration)
        {
            _context = context;
            _masterDb = masterDb;
            _configuration = configuration;
        }

        public async Task<string> SavePermissions(SaveAdminPermissionDto dto)
        {
            if (dto == null)
                throw new ArgumentException("Request body cannot be null.");

            if (dto.Modules == null || dto.Modules.Count == 0)
                throw new ArgumentException("Modules cannot be null or empty.");

            // 1. Locate Admin in either Master or Context database
            var adminInMaster = await _masterDb.Admins
                .FirstOrDefaultAsync(x => x.Id == dto.AdminId);

            var adminInContext = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == dto.AdminId);

            var admin = adminInMaster ?? adminInContext;

            if (admin == null)
                return "Admin not found.";

            // 2. Always persist permissions in Master DB
            try
            {
                var oldMasterPerms = await _masterDb.AdminPermissions
                    .Where(x => x.AdminId == dto.AdminId)
                    .ToListAsync();

                if (oldMasterPerms.Any())
                {
                    _masterDb.AdminPermissions.RemoveRange(oldMasterPerms);
                }

                foreach (var module in dto.Modules)
                {
                    _masterDb.AdminPermissions.Add(new AdminPermission
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

                await _masterDb.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminPermissionService] Error saving master permissions: {ex.Message}");
            }

            // 3. Persist in current Context (if not already master DB)
            try
            {
                var oldContextPerms = await _context.AdminPermissions
                    .Where(x => x.AdminId == dto.AdminId)
                    .ToListAsync();

                if (oldContextPerms.Any())
                {
                    _context.AdminPermissions.RemoveRange(oldContextPerms);
                }

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
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminPermissionService] Error saving context permissions: {ex.Message}");
            }

            // 4. Sync directly to the tenant database if admin belongs to an organization
            int? orgId = admin.OrganizationId ?? adminInMaster?.OrganizationId;
            if (orgId.HasValue && orgId.Value > 0)
            {
                await SyncAdminPermissionsToTenantDatabaseAsync(admin, orgId.Value, dto.Modules);
            }

            return "Permissions saved successfully.";
        }

        public async Task<object> GetAllowedModules(int adminId)
        {
            // 1. Locate Admin
            var admin = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
            {
                admin = await _masterDb.Admins
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == adminId);
            }

            if (admin == null)
                throw new Exception("Admin not found.");

            // 2. Query allowed modules from current context
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

            // 3. Fallback: If tenant DB returned 0 modules, check Master DB
            if (!allowedModules.Any())
            {
                var masterAllowed = await (
                    from permission in _masterDb.AdminPermissions.AsNoTracking()
                    join module in _masterDb.Modules.AsNoTracking()
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

                if (masterAllowed.Any())
                {
                    allowedModules = masterAllowed;

                    // Asynchronously heal tenant database if admin belongs to an organization
                    int? orgId = admin.OrganizationId;
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var masterAllPerms = await _masterDb.AdminPermissions
                                    .AsNoTracking()
                                    .Where(x => x.AdminId == adminId)
                                    .Select(p => new AdminModulePermissionDto
                                    {
                                        ModuleId = p.ModuleId,
                                        CanAccess = p.CanAccess,
                                        CanView = p.CanView,
                                        CanAdd = p.CanAdd,
                                        CanEdit = p.CanEdit,
                                        CanDelete = p.CanDelete
                                    })
                                    .ToListAsync();

                                await SyncAdminPermissionsToTenantDatabaseAsync(admin, orgId.Value, masterAllPerms);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[AdminPermissionService] Self-heal error: {ex.Message}");
                            }
                        });
                    }
                }
            }

            return new
            {
                AdminId = admin.Id,
                AdminEmail = admin.Email,
                Modules = allowedModules
            };
        }

        public async Task<object> GetPermissions(int adminId)
        {
            // 1. Locate Admin
            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Id == adminId);

            if (admin == null)
            {
                admin = await _masterDb.Admins
                    .FirstOrDefaultAsync(x => x.Id == adminId);
            }

            if (admin == null)
                throw new Exception("Admin not found.");

            // 2. Get ALL modules (fallback to Master if context is empty)
            var modules = await _context.Modules
                .AsNoTracking()
                .OrderBy(m => m.ModuleId)
                .ToListAsync();

            if (!modules.Any())
            {
                modules = await _masterDb.Modules
                    .AsNoTracking()
                    .OrderBy(m => m.ModuleId)
                    .ToListAsync();
            }

            // 3. Get permissions already saved for this Admin (fallback to Master if context is empty)
            var permissions = await _context.AdminPermissions
                .AsNoTracking()
                .Where(x => x.AdminId == adminId)
                .ToListAsync();

            if (!permissions.Any())
            {
                permissions = await _masterDb.AdminPermissions
                    .AsNoTracking()
                    .Where(x => x.AdminId == adminId)
                    .ToListAsync();
            }

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

        private async Task SyncAdminPermissionsToTenantDatabaseAsync(Admin admin, int organizationId, List<AdminModulePermissionDto> modules)
        {
            if (organizationId <= 0 || modules == null || !modules.Any())
                return;

            try
            {
                var org = await _masterDb.Organizations
                    .FirstOrDefaultAsync(o => o.Id == organizationId && !o.IsDeleted);

                if (org == null || string.IsNullOrWhiteSpace(org.DatabaseName))
                    return;

                var template = _configuration.GetConnectionString("TenantConnectionTemplate")
                    ?? "Server={Host};Port={Port};Database={Database};User={User};Password={Password};SslMode=None;AllowPublicKeyRetrieval=True;Allow User Variables=True;";

                var connStr = template
                    .Replace("{Host}", string.IsNullOrWhiteSpace(org.DbHost) ? "localhost" : org.DbHost)
                    .Replace("{Port}", (org.DbPort > 0 ? org.DbPort : 3306).ToString())
                    .Replace("{Database}", org.DatabaseName)
                    .Replace("{User}", string.IsNullOrWhiteSpace(org.DbUser) ? "root" : org.DbUser)
                    .Replace("{Password}", org.DbPassword ?? "");

                using var conn = new MySqlConnection(connStr);
                await conn.OpenAsync();

                // 1. Ensure `modules` table in tenant DB is populated
                using (var checkModCmd = new MySqlCommand("SELECT COUNT(*) FROM modules;", conn))
                {
                    var modCount = Convert.ToInt32(await checkModCmd.ExecuteScalarAsync());
                    if (modCount == 0)
                    {
                        var masterMods = await _masterDb.Modules.AsNoTracking().ToListAsync();
                        foreach (var m in masterMods)
                        {
                            using var insMod = new MySqlCommand(
                                "INSERT IGNORE INTO modules (ModuleId, ModuleName, Type, IsActive) VALUES (@ModuleId, @ModuleName, @Type, 1);", conn);
                            insMod.Parameters.AddWithValue("@ModuleId", m.ModuleId);
                            insMod.Parameters.AddWithValue("@ModuleName", m.ModuleName ?? "");
                            insMod.Parameters.AddWithValue("@Type", m.Type ?? "");
                            await insMod.ExecuteNonQueryAsync();
                        }
                    }
                }

                // 2. Delete existing permissions in tenant DB for this Admin
                using (var delCmd = new MySqlCommand("DELETE FROM adminpermissions WHERE AdminId = @AdminId;", conn))
                {
                    delCmd.Parameters.AddWithValue("@AdminId", admin.Id);
                    await delCmd.ExecuteNonQueryAsync();
                }

                // 3. Insert new permissions into tenant DB
                foreach (var mod in modules)
                {
                    using var insCmd = new MySqlCommand(
                        @"INSERT INTO adminpermissions (AdminId, ModuleId, CanView, CanAdd, CanEdit, CanDelete, CanAccess)
                          VALUES (@AdminId, @ModuleId, @CanView, @CanAdd, @CanEdit, @CanDelete, @CanAccess);", conn);
                    insCmd.Parameters.AddWithValue("@AdminId", admin.Id);
                    insCmd.Parameters.AddWithValue("@ModuleId", mod.ModuleId);
                    insCmd.Parameters.AddWithValue("@CanView", mod.CanView ? 1 : 0);
                    insCmd.Parameters.AddWithValue("@CanAdd", mod.CanAdd ? 1 : 0);
                    insCmd.Parameters.AddWithValue("@CanEdit", mod.CanEdit ? 1 : 0);
                    insCmd.Parameters.AddWithValue("@CanDelete", mod.CanDelete ? 1 : 0);
                    insCmd.Parameters.AddWithValue("@CanAccess", mod.CanAccess ? 1 : 0);
                    await insCmd.ExecuteNonQueryAsync();
                }

                Console.WriteLine($"[AdminPermissionService] Successfully synced {modules.Count} permissions for Admin {admin.Id} ({admin.Email}) to tenant DB {org.DatabaseName}.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminPermissionService Error] Failed syncing permissions to tenant DB: {ex.Message}");
            }
        }
    }
}