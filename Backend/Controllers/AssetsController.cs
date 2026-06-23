using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers

{

    [ApiController]

    [Route("api/[controller]")]

    public class AssetsController : ControllerBase

    {

        private readonly IAssetService _service;

        public AssetsController(IAssetService service)

        {

            _service = service;

        }

        // GET ALL

        [HttpGet]

        public async Task<IActionResult> GetAll()

        {

            var data = await _service.GetAllAssets();

            return Ok(data);

        }

        // GET BY ID

        [HttpGet("{id}")]

        public async Task<IActionResult> GetById(int id)

        {

            var asset = await _service.GetAssetById(id);

            if (asset == null)

                return NotFound(new { message = "Asset not found" });

            return Ok(asset);

        }

        // CREATE

        [HttpPost]

        public async Task<IActionResult> Create([FromForm] AssetDto dto)

        {

            var result = await _service.CreateAsset(dto);

            return Ok(new { message = result });

        }

        // UPDATE

        [HttpPut("{id}")]

        public async Task<IActionResult> Update(int id, [FromForm] AssetDto dto)

        {

            var result = await _service.UpdateAsset(id, dto);

            if (result == "Asset not found")

                return NotFound(new { message = result });

            return Ok(new { message = result });

        }

        // DELETE

        [HttpDelete("{id}")]

        public async Task<IActionResult> Delete(int id)

        {

            var result = await _service.DeleteAsset(id);

            if (result == "Asset not found")

                return NotFound(new { message = result });

            return Ok(new { message = result });

        }

        [HttpGet("export-report")]

        public async Task<IActionResult> ExportAssetsReport()

        {

            var fileBytes =

                await _service.ExportAssetsReport();

            return File(

                fileBytes,

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                $"Assets_Report_{DateTime.Now:dd_MMM_yyyy}.xlsx");

        }

    }

}

