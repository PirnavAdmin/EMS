using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExperienceLetterController : ControllerBase
    {
        private readonly IExperienceLetterService _service;
        private readonly AppDbContext _context;

        public ExperienceLetterController(
            IExperienceLetterService service,
            AppDbContext context)
        {
            _service = service;
            _context = context;
        }

        // ===============================
        // GENERATE
        // ===============================

        [HttpPost("generate")]
        public async Task<IActionResult> Generate(
            [FromBody] ExperienceLetterRequestDto dto)
        {
            if (dto == null)
                return BadRequest("Request body is required.");

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue || (adminIds != null && adminIds.Any()))
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, dto.EmployeeId);
                if (!inTenant)
                {
                    return NotFound(new { message = "Employee not found in your organization." });
                }
            }

            var result = await _service.GenerateExperienceLetterAsync(dto);
            return Ok(result);
        }

        // ===============================
        // GET ALL
        // ===============================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllExperienceLettersAsync();
            return Ok(result);
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send(
            [FromBody] SendExperienceLetterDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.ExperienceLetters.FindAsync(dto.ExperienceLetterId);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound(new { Message = "Experience letter not found in your organization." });
            }

            await _service.SendExperienceLetterAsync(dto);

            return Ok(new
            {
                Message = "Experience Letter sent successfully."
            });
        }

        // ===============================
        // DOWNLOAD
        // ===============================

        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.ExperienceLetters.FindAsync(id);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound();
            }

            var result = await _service.DownloadExperienceLetterAsync(id);

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
        public async Task<IActionResult> Preview(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.ExperienceLetters.FindAsync(id);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound();
            }

            var bytes = await _service.PreviewExperienceLetterAsync(id);

            return File(
                bytes,
                "application/pdf");
        }

        // ===============================
        // DELETE
        // ===============================

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.ExperienceLetters.FindAsync(id);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound(new { Message = "Experience letter not found in your organization." });
            }

            await _service.DeleteExperienceLetterAsync(id);

            return Ok(new
            {
                Message = "Experience Letter deleted successfully."
            });
        }
    }
}