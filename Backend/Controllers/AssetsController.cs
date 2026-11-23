using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Assets controller with complete Audit Logging
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AssetsController : ControllerBase
    {
        private readonly IAssetService _service;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public AssetsController(
            IAssetService service,
            IAuditLogService auditLogService) // varsha
        {
            _service = service;
            _auditLogService = auditLogService; // varsha
        }

        //[Permission(ModuleIds.Assets, PermissionAction.View)]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAssets();
            return Ok(data);
        }

        //[Permission(ModuleIds.Assets, PermissionAction.View)]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var asset = await _service.GetAssetById(id);

            if (asset == null)
                return NotFound(new { message = "Asset not found" });

            return Ok(asset);
        }

        //[Permission(ModuleIds.Assets, PermissionAction.Add)]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] AssetDto dto)
        {
            var result = await _service.CreateAsset(dto);

            // varsha - Audit asset creation
            if (result != null && result.Contains("successfully", StringComparison.OrdinalIgnoreCase))
            {
                await _auditLogService.LogCreateAsync(
                    module: "Assets",
                    entityName: "Asset",
                    entityId: dto.AssetName,
                    description: $"Created asset '{dto.AssetName}'",
                    newValues: dto,
                    user: User);
            }

            return Ok(new { message = result });
        }

        //[Permission(ModuleIds.Assets, PermissionAction.Edit)]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] AssetDto dto)
        {
            // varsha - Capture existing asset state before update
            var existingAsset = await _service.GetAssetById(id);
            if (existingAsset == null)
                return NotFound(new { message = "Asset not found" });

            var oldValues = new
            {
                existingAsset.AssetName,
                existingAsset.SerialNo,
                existingAsset.Status,
                existingAsset.AssignedTo,
                existingAsset.Description
            };

            var result = await _service.UpdateAsset(id, dto);

            if (result == "Asset not found")
                return NotFound(new { message = result });

            // varsha - Audit asset update with full old and new values delta
            if (result.Contains("successfully", StringComparison.OrdinalIgnoreCase))
            {
                await _auditLogService.LogUpdateAsync(
                    module: "Assets",
                    entityName: "Asset",
                    entityId: id.ToString(),
                    description: $"Updated asset '{existingAsset.AssetName}' (ID: {id})",
                    oldValues: oldValues,
                    newValues: dto,
                    user: User);
            }

            return Ok(new { message = result });
        }

        //[Permission(ModuleIds.Assets, PermissionAction.Delete)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            // varsha - Capture existing asset state before deletion
            var existingAsset = await _service.GetAssetById(id);
            if (existingAsset == null)
                return NotFound(new { message = "Asset not found" });

            var oldValues = new
            {
                existingAsset.Id,
                existingAsset.AssetName,
                existingAsset.SerialNo,
                existingAsset.Status,
                existingAsset.AssignedTo
            };

            var result = await _service.DeleteAsset(id);

            if (result == "Asset not found")
                return NotFound(new { message = result });

            // varsha - Audit asset deletion
            await _auditLogService.LogDeleteAsync(
                module: "Assets",
                entityName: "Asset",
                entityId: id.ToString(),
                description: $"Deleted asset '{existingAsset.AssetName}' (ID: {id})",
                oldValues: oldValues,
                user: User);

            return Ok(new { message = result });
        }

        //[Permission(ModuleIds.Assets, PermissionAction.View)]
        [HttpGet("export-report")]
        public async Task<IActionResult> ExportAssetsReport()
        {
            var fileBytes = await _service.ExportAssetsReport();

            return File(
                fileBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Assets_Report_{DateTime.Now:dd_MMM_yyyy}.xlsx");
        }
    }
}



