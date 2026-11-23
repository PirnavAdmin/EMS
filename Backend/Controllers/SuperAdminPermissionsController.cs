using System;
using System.Linq;
using System.Threading.Tasks;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models.Master;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SuperAdminPermissionsController : ControllerBase
    {
        private readonly MasterDbContext _masterDb;
        private readonly ITenantProvider _tenantProvider;

        public SuperAdminPermissionsController(MasterDbContext masterDb, ITenantProvider tenantProvider)
        {
            _masterDb = masterDb;
            _tenantProvider = tenantProvider;
        }

        // ============================================================
        // GET MODULE PERMISSIONS FOR AN ORGANIZATION (SuperAdmin Only)
        // ============================================================
        [HttpGet("{orgCode}")]
        public async Task<IActionResult> GetPermissions(string orgCode)
        {
            if (string.IsNullOrWhiteSpace(orgCode))
                return BadRequest(new { message = "Organization code is required." });

            var permissions = await _masterDb.OrganizationModulePermissions
                .Where(p => p.OrganizationCode == orgCode)
                .Select(p => new
                {
                    p.Id,
                    p.OrganizationCode,
                    p.ModuleKey,
                    p.IsEnabled,
                    p.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                organizationCode = orgCode,
                permissions = permissions
            });
        }

        // ============================================================
        // TOGGLE MODULE PERMISSION (SuperAdmin Only)
        // ============================================================
        [HttpPost("{orgCode}/toggle")]
        public async Task<IActionResult> TogglePermission(string orgCode, [FromBody] ToggleModulePermissionDto dto)
        {
            if (string.IsNullOrWhiteSpace(orgCode) || string.IsNullOrWhiteSpace(dto.ModuleKey))
                return BadRequest(new { message = "Organization code and module key are required." });

            var perm = await _masterDb.OrganizationModulePermissions
                .FirstOrDefaultAsync(p => p.OrganizationCode == orgCode && p.ModuleKey == dto.ModuleKey);

            if (perm == null)
            {
                perm = new OrganizationModulePermission
                {
                    OrganizationCode = orgCode,
                    ModuleKey = dto.ModuleKey.ToUpper(),
                    IsEnabled = dto.IsEnabled,
                    UpdatedAt = DateTime.UtcNow
                };
                _masterDb.OrganizationModulePermissions.Add(perm);
            }
            else
            {
                perm.IsEnabled = dto.IsEnabled;
                perm.UpdatedAt = DateTime.UtcNow;
            }

            await _masterDb.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Module '{dto.ModuleKey}' for organization '{orgCode}' set to {(dto.IsEnabled ? "ENABLED" : "DISABLED")}.",
                organizationCode = orgCode,
                moduleKey = dto.ModuleKey,
                isEnabled = dto.IsEnabled
            });
        }

        // ============================================================
        // GET CURRENT TENANT MODULE PERMISSIONS (For Active Tenant UI)
        // ============================================================
        [HttpGet("tenant-modules")]
        public async Task<IActionResult> GetCurrentTenantModules()
        {
            var orgCode = _tenantProvider.GetCurrentOrganizationCode();

            if (string.IsNullOrWhiteSpace(orgCode) || string.Equals(orgCode, "master", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new
                {
                    organizationCode = orgCode ?? string.Empty,
                    modules = new Dictionary<string, bool>()
                });
            }

            var permissions = await _masterDb.OrganizationModulePermissions
                .Where(p => p.OrganizationCode == orgCode)
                .ToDictionaryAsync(p => p.ModuleKey, p => p.IsEnabled);

            return Ok(new
            {
                organizationCode = orgCode,
                modules = permissions
            });
        }
    }

    public class ToggleModulePermissionDto
    {
        public string ModuleKey { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
    }
}
