using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RelievingLetterController : ControllerBase
    {
        private readonly IRelievingLetterService _service;

        public RelievingLetterController(IRelievingLetterService service)
        {
            _service = service;
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]
        [HttpPost("generate")]
        public async Task<IActionResult> Generate(
     [FromBody] RelievingLetterRequestDto? dto)
        {
            if (dto == null)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = "Request body is required."
                });
            }

            try
            {
                var result =
                    await _service
                        .GenerateRelievingLetterAsync(dto);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            var file = await _service.DownloadRelievingLetterAsync(id);

            return File(
                file.FileBytes,
                "application/pdf",
                file.FileName);
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllRelievingLettersAsync();
            return Ok(result);
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("preview/{id}")]
        public async Task<IActionResult> Preview(int id)
        {
            var pdf = await _service.PreviewRelievingLetterAsync(id);

            return File(pdf, "application/pdf");
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]
        [HttpPost("send")]
        public async Task<IActionResult> Send(SendRelievingLetterDto dto)
        {
            await _service.SendRelievingLetterAsync(dto);

            return Ok(new
            {
                Success = true,
                Message = "Relieving Letter sent successfully."
            });
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.Delete)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteRelievingLetterAsync(id);

            return Ok(new
            {
                Success = true,
                Message = "Relieving Letter deleted successfully."
            });
        }

        [HttpGet("{id}/send-status")]
        public async Task<IActionResult> GetSendStatus(int id)
        {
            var result = await _service.GetSendStatusAsync(id);
            return Ok(result);
        }
    }
}