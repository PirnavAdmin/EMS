// varsha - Production-ready multi-tenant resolution and tenant database provisioning
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class TenantService : ITenantService
    {
        private readonly IConfiguration _configuration;
        private readonly AppDbContext _context;
        private static readonly ConcurrentDictionary<string, bool> InitializedTenants = new(StringComparer.OrdinalIgnoreCase);
        private static readonly ConcurrentDictionary<string, SemaphoreSlim>
    TenantInitializationLocks =
        new(StringComparer.OrdinalIgnoreCase);

        public TenantService(IConfiguration configuration, AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        public async Task<string?> ResolveOrganizationCodeAsync(ClaimsPrincipal? user)
        {
            if (user == null) return null;

            // 1. Direct claim lookup
            var orgCodeClaim = user.FindFirst("OrganizationCode")?.Value;
            if (!string.IsNullOrWhiteSpace(orgCodeClaim))
            {
                return orgCodeClaim.Trim();
            }

            // 2. Organization Admin lookup via AdminId
            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int adminId))
            {
                var admin = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId);
                if (admin?.OrganizationId != null)
                {
                    var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == admin.OrganizationId.Value);
                    if (!string.IsNullOrWhiteSpace(org?.OrganizationCode))
                    {
                        return org.OrganizationCode.Trim();
                    }
                }
            }

            // 3. Employee lookup via EmployeeId
            var employeeIdClaim = user.FindFirst("EmployeeId")?.Value;
            if (!string.IsNullOrWhiteSpace(employeeIdClaim))
            {
                var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == employeeIdClaim);
                if (employee?.OrganizationId != null)
                {
                    var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == employee.OrganizationId.Value);
                    if (!string.IsNullOrWhiteSpace(org?.OrganizationCode))
                    {
                        return org.OrganizationCode.Trim();
                    }
                }
                else if (employee?.AdminId != null)
                {
                    var admin = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == employee.AdminId.Value);
                    if (admin?.OrganizationId != null)
                    {
                        var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == admin.OrganizationId.Value);
                        if (!string.IsNullOrWhiteSpace(org?.OrganizationCode))
                        {
                            return org.OrganizationCode.Trim();
                        }
                    }
                }
            }

            // 4. Fallback lookup via user email
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim();
            if (!string.IsNullOrWhiteSpace(email))
            {
                var adminByEmail = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Email.ToLower() == email.ToLower());
                if (adminByEmail?.OrganizationId != null)
                {
                    var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == adminByEmail.OrganizationId.Value);
                    if (!string.IsNullOrWhiteSpace(org?.OrganizationCode))
                    {
                        return org.OrganizationCode.Trim();
                    }
                }
            }

            return null;
        }

        public string GetTenantConnectionString(string organizationCode)
        {
            var baseConn = _configuration.GetConnectionString("MasterConnection")
                ?? _configuration.GetConnectionString("DefaultConnection")
                ?? string.Empty;

            if (string.IsNullOrWhiteSpace(baseConn) || string.IsNullOrWhiteSpace(organizationCode))
            {
                return baseConn;
            }

            string safeOrgCode = Regex.Replace(organizationCode.Trim().ToLowerInvariant(), @"[^a-z0-9_]", "_");
            string tenantDbName = $"ems_tenant_{safeOrgCode}";

            try
            {
                var builder = new MySqlConnectionStringBuilder(baseConn)
                {
                    Database = tenantDbName
                };
                return builder.ConnectionString;
            }
            catch
            {
                // Regex fallback if connection string builder fails
                return Regex.Replace(baseConn, @"Database=[^;]+;", $"Database={tenantDbName};", RegexOptions.IgnoreCase);
            }
        }


        public async Task EnsureTenantDatabaseAndAuditTableAsync(string organizationCode)
        {
            if (string.IsNullOrWhiteSpace(organizationCode))
                return;

            string safeOrgCode = Regex.Replace(
                organizationCode.Trim().ToLowerInvariant(),
                @"[^a-z0-9_]",
                "_");

            string tenantDbName = $"ems_tenant_{safeOrgCode}";

            if (InitializedTenants.ContainsKey(tenantDbName))
                return;

            var initializationLock = TenantInitializationLocks.GetOrAdd(
                tenantDbName,
                _ => new SemaphoreSlim(1, 1));

            await initializationLock.WaitAsync();

            try
            {
                // Check again after acquiring the lock.
                if (InitializedTenants.ContainsKey(tenantDbName))
                    return;

                var baseConn = _configuration.GetConnectionString("MasterConnection")
                    ?? _configuration.GetConnectionString("DefaultConnection");

                if (string.IsNullOrWhiteSpace(baseConn))
                    return;

                try
                {
                    // 1. Create tenant database if it doesn't exist.
                    await using (var serverConnection = new MySqlConnection(baseConn))
                    {
                        await serverConnection.OpenAsync();

                        var createDbSql =
                            $"CREATE DATABASE IF NOT EXISTS `{tenantDbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";

                        await using var cmd = new MySqlCommand(createDbSql, serverConnection);
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 2. Create auditlogs table in tenant database.
                    var tenantConn = GetTenantConnectionString(organizationCode);

                    await using (var tenantConnection = new MySqlConnection(tenantConn))
                    {
                        await tenantConnection.OpenAsync();

                        var createTableSql = @"
CREATE TABLE IF NOT EXISTS `auditlogs` (
    `Id` BIGINT NOT NULL AUTO_INCREMENT,
    `OrganizationCode` VARCHAR(100) NOT NULL,
    `UserId` VARCHAR(100) NULL,
    `UserName` VARCHAR(255) NULL,
    `UserRole` VARCHAR(100) NULL,
    `Action` VARCHAR(100) NOT NULL,
    `Module` VARCHAR(100) NOT NULL,
    `EntityName` VARCHAR(100) NULL,
    `EntityId` VARCHAR(100) NULL,
    `Description` TEXT NULL,
    `OldValues` LONGTEXT NULL,
    `NewValues` LONGTEXT NULL,
    `IpAddress` VARCHAR(100) NULL,
    `UserAgent` VARCHAR(500) NULL,
    `RequestMethod` VARCHAR(20) NULL,
    `RequestPath` VARCHAR(500) NULL,
    `StatusCode` INT NOT NULL DEFAULT 200,
    `CorrelationId` VARCHAR(100) NULL,
    `CreatedAt` DATETIME(6) NOT NULL,
    PRIMARY KEY (`Id`),
    INDEX `IX_auditlogs_OrganizationCode` (`OrganizationCode`),
    INDEX `IX_auditlogs_CreatedAt` (`CreatedAt`),
    INDEX `IX_auditlogs_UserId` (`UserId`),
    INDEX `IX_auditlogs_Module` (`Module`),
    INDEX `IX_auditlogs_Action` (`Action`),
    INDEX `IX_auditlogs_EntityName_EntityId` (`EntityName`, `EntityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

                        await using var cmd = new MySqlCommand(createTableSql, tenantConnection);
                        await cmd.ExecuteNonQueryAsync();

                        await EnsureColumnsAndIndexesExistAsync(
                            tenantConnection,
                            "auditlogs");
                    }

                    InitializedTenants[tenantDbName] = true;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[TenantProvisioningNotice] {ex.Message}");

                    await EnsureAuditTableInDefaultDatabaseAsync(baseConn);

                    InitializedTenants[tenantDbName] = true;
                }
            }
            finally
            {
                initializationLock.Release();
            }
        }

        private async Task EnsureAuditTableInDefaultDatabaseAsync(string baseConn)
        {
            try
            {
                await using var connection = new MySqlConnection(baseConn);
                await connection.OpenAsync();
                var createTableSql = @"
CREATE TABLE IF NOT EXISTS `auditlogs` (
    `Id` BIGINT NOT NULL AUTO_INCREMENT,
    `OrganizationCode` VARCHAR(100) NOT NULL,
    `UserId` VARCHAR(100) NULL,
    `UserName` VARCHAR(255) NULL,
    `UserRole` VARCHAR(100) NULL,
    `Action` VARCHAR(100) NOT NULL,
    `Module` VARCHAR(100) NOT NULL,
    `EntityName` VARCHAR(100) NULL,
    `EntityId` VARCHAR(100) NULL,
    `Description` TEXT NULL,
    `OldValues` LONGTEXT NULL,
    `NewValues` LONGTEXT NULL,
    `IpAddress` VARCHAR(100) NULL,
    `UserAgent` VARCHAR(500) NULL,
    `RequestMethod` VARCHAR(20) NULL,
    `RequestPath` VARCHAR(500) NULL,
    `StatusCode` INT NOT NULL DEFAULT 200,
    `CorrelationId` VARCHAR(100) NULL,
    `CreatedAt` DATETIME(6) NOT NULL,
    PRIMARY KEY (`Id`),
    INDEX `IX_auditlogs_OrganizationCode` (`OrganizationCode`),
    INDEX `IX_auditlogs_CreatedAt` (`CreatedAt`),
    INDEX `IX_auditlogs_UserId` (`UserId`),
    INDEX `IX_auditlogs_Module` (`Module`),
    INDEX `IX_auditlogs_Action` (`Action`),
    INDEX `IX_auditlogs_EntityName_EntityId` (`EntityName`, `EntityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
                await using var cmd = new MySqlCommand(createTableSql, connection);
                await cmd.ExecuteNonQueryAsync();

                await EnsureColumnsAndIndexesExistAsync(connection, "auditlogs");
            }
            catch
            {
                // Ignore if table already exists or schema cannot be altered directly
            }
        }

        private static async Task EnsureColumnsAndIndexesExistAsync(MySqlConnection connection, string tableName)
        {
            try
            {
                // 1. Inspect existing columns
                var existingCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var checkCmd = new MySqlCommand(
                    $"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tableName}';", 
                    connection);
                await using (var reader = await checkCmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        existingCols.Add(reader.GetString(0));
                    }
                }

                var columnsToAdd = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "OrganizationCode", "VARCHAR(100) NOT NULL DEFAULT ''" },
                    { "UserId", "VARCHAR(100) NULL" },
                    { "UserName", "VARCHAR(255) NULL" },
                    { "UserRole", "VARCHAR(100) NULL" },
                    { "Action", "VARCHAR(100) NOT NULL DEFAULT ''" },
                    { "Module", "VARCHAR(100) NOT NULL DEFAULT ''" },
                    { "EntityName", "VARCHAR(100) NULL" },
                    { "EntityId", "VARCHAR(100) NULL" },
                    { "Description", "TEXT NULL" },
                    { "OldValues", "LONGTEXT NULL" },
                    { "NewValues", "LONGTEXT NULL" },
                    { "IpAddress", "VARCHAR(100) NULL" },
                    { "UserAgent", "VARCHAR(500) NULL" },
                    { "RequestMethod", "VARCHAR(20) NULL" },
                    { "RequestPath", "VARCHAR(500) NULL" },
                    { "StatusCode", "INT NOT NULL DEFAULT 200" },
                    { "CorrelationId", "VARCHAR(100) NULL" },
                    { "CreatedAt", "DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)" }
                };

                foreach (var (colName, colDef) in columnsToAdd)
                {
                    if (!existingCols.Contains(colName))
                    {
                        try
                        {
                            var alterSql = $"ALTER TABLE `{tableName}` ADD COLUMN `{colName}` {colDef};";
                            await using var alterCmd = new MySqlCommand(alterSql, connection);
                            await alterCmd.ExecuteNonQueryAsync();
                        }
                        catch { /* column might already exist */ }
                    }
                }

                if (existingCols.Contains("OldValue"))
                {
                    try
                    {
                        var copyOldSql = $"UPDATE `{tableName}` SET `OldValues` = `OldValue` WHERE `OldValue` IS NOT NULL AND (`OldValues` IS NULL OR `OldValues` = '');";
                        await using var copyOldCmd = new MySqlCommand(copyOldSql, connection);
                        await copyOldCmd.ExecuteNonQueryAsync();
                    }
                    catch { /* ignore */ }
                }
                if (existingCols.Contains("NewValue"))
                {
                    try
                    {
                        var copyNewSql = $"UPDATE `{tableName}` SET `NewValues` = `NewValue` WHERE `NewValue` IS NOT NULL AND (`NewValues` IS NULL OR `NewValues` = '');";
                        await using var copyNewCmd = new MySqlCommand(copyNewSql, connection);
                        await copyNewCmd.ExecuteNonQueryAsync();
                    }
                    catch { /* ignore */ }
                }

                // 2. Inspect existing indexes
                var existingIndexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var checkIdxCmd = new MySqlCommand(
                    $"SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{tableName}';", 
                    connection);
                await using (var reader = await checkIdxCmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        existingIndexes.Add(reader.GetString(0));
                    }
                }

                var indexesToAdd = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    { "IX_auditlogs_OrganizationCode", "(`OrganizationCode`)" },
                    { "IX_auditlogs_CreatedAt", "(`CreatedAt`)" },
                    { "IX_auditlogs_UserId", "(`UserId`)" },
                    { "IX_auditlogs_Module", "(`Module`)" },
                    { "IX_auditlogs_Action", "(`Action`)" },
                    { "IX_auditlogs_EntityName_EntityId", "(`EntityName`, `EntityId`)" }
                };

                foreach (var (idxName, colList) in indexesToAdd)
                {
                    if (!existingIndexes.Contains(idxName))
                    {
                        try
                        {
                            var createIdxSql = $"CREATE INDEX `{idxName}` ON `{tableName}` {colList};";
                            await using var idxCmd = new MySqlCommand(createIdxSql, connection);
                            await idxCmd.ExecuteNonQueryAsync();
                        }
                        catch { /* index might already exist */ }
                    }
                }
            }
            catch
            {
                // Fallback safe: do not crash if inspection privileges are constrained
            }
        }


        public AppDbContext CreateTenantDbContext(string organizationCode)
        {
            var tenantConn = GetTenantConnectionString(organizationCode);
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

            var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

            try
            {
                optionsBuilder.UseMySql(
                    tenantConn,
                    serverVersion,
                    mysqlOptions =>
                    {
                        mysqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorNumbersToAdd: null);
                    });

                return new AppDbContext(optionsBuilder.Options);
            }
            catch
            {
                var baseConn = _configuration.GetConnectionString("MasterConnection")
                    ?? _configuration.GetConnectionString("DefaultConnection");

                optionsBuilder.UseMySql(
                    baseConn!,
                    serverVersion,
                    mysqlOptions =>
                    {
                        mysqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorNumbersToAdd: null);
                    });

                return new AppDbContext(optionsBuilder.Options);
            }
        }

    }
}

