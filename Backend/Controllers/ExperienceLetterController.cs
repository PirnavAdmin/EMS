using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExperienceLetterController
        : ControllerBase
    {
        private readonly IExperienceLetterService
            _service;

        public ExperienceLetterController(
            IExperienceLetterService service)
        {
            _service = service;
        }


        // ===============================
        // GENERATE
        // ===============================

        [HttpPost("generate")]
        public async Task<IActionResult> Generate(
            [FromBody]
            ExperienceLetterRequestDto dto)
        {
            var result =
                await _service
                    .GenerateExperienceLetterAsync(dto);

            return Ok(result);
        }


        // ===============================
        // GET ALL
        // ===============================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result =
                await _service
                    .GetAllExperienceLettersAsync();

            return Ok(result);
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send(
    [FromBody] SendExperienceLetterDto dto)
        {
            await _service.SendExperienceLetterAsync(dto);

            return Ok(new
            {
                Message =
                    "Experience Letter sent successfully."
            });
        }

        // ===============================
        // DOWNLOAD
        // ===============================

        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(
            int id)
        {
            var result =
                await _service
                    .DownloadExperienceLetterAsync(id);

            if (result == null)
                return NotFound();

            return File(
                result.FileBytes,
                "application/pdf",
                result.FileName);
        }



        // ===============================
        // PREVIEW
        // ===============================

        [HttpGet("preview/{id}")]
        public async Task<IActionResult> Preview(
            int id)
        {
            var bytes =
                await _service
                    .PreviewExperienceLetterAsync(id);

            return File(
                bytes,
                "application/pdf");
        }


        // ===============================
        // DELETE
        // ===============================

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(
            int id)
        {
            await _service
                .DeleteExperienceLetterAsync(id);

            return Ok(new
            {
                Message =
                    "Experience Letter deleted successfully."
            });
        }
    }
}