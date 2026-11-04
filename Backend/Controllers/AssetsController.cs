using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using Microsoft.AspNetCore.Authorization;

namespace EmployeeManagementSystem.Controllers

{


    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AssetsController : ControllerBase
    {
        private readonly IAssetService _service;

        public AssetsController(IAssetService service)
        {
            _service = service;
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

            return Ok(new { message = result });
        }

        //[Permission(ModuleIds.Assets, PermissionAction.Edit)]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] AssetDto dto)
        {
            var result = await _service.UpdateAsset(id, dto);

            if (result == "Asset not found")
                return NotFound(new { message = result });

            return Ok(new { message = result });
        }

        //[Permission(ModuleIds.Assets, PermissionAction.Delete)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsset(id);

            if (result == "Asset not found")
                return NotFound(new { message = result });

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



