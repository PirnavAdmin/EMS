using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ExperienceOfferLetterController : ControllerBase
    {
        private readonly IOfferLetterService _experienceofferLetterService;
        private readonly AppDbContext _context;

        public ExperienceOfferLetterController(
            IOfferLetterService offerLetterService,
            AppDbContext context)
        {
            _experienceofferLetterService = offerLetterService;
            _context = context;
        }

        //---------------------------------------
        // Generate Offer Letter
        //---------------------------------------

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] OfferLetterRequestDto dto)
        {
            var result = await _experienceofferLetterService.GenerateAsync(dto);

            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(result.Message);
        }

        //---------------------------------------
        // GET ALL OFFER LETTERS (Admin View)
        //---------------------------------------

        [HttpGet("all")]
        public async Task<IActionResult> GetAllOfferLetters()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            var query = _context.OfferLetters.AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var letters = await query
                .OrderByDescending(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.OrganizationId,
                    x.Candidate_Name,
                    x.Email,
                    x.Position,
                    x.Department,
                    GeneratedDate = x.Generated_On,
                    Generated_On = x.Generated_On,
                    Joining_Date = x.Joining_Date,
                    x.Status,
                    DownloadUrl = $"{Request.Scheme}://{Request.Host}/api/OfferLetter/download/{x.Id}"
                })
                .ToListAsync();

            return Ok(letters);
        }

        //---------------------------------------
        // Download Offer Letter
        //---------------------------------------

        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            var record = await _context.OfferLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (record == null)
                return NotFound("Offer letter not found.");

            if (orgId.HasValue && orgId.Value > 0 && record.OrganizationId != orgId.Value)
                return NotFound("Offer letter not found.");

            if (!System.IO.File.Exists(record.File_Path))
                return NotFound("File not found on server.");

            var bytes = await System.IO.File.ReadAllBytesAsync(record.File_Path);

            return File(bytes,
                "application/pdf",
                Path.GetFileName(record.File_Path));
        }

        [HttpGet("preview/{id}")]
        public async Task<IActionResult> PreviewOfferLetter(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.OfferLetters.FindAsync(id);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound("Offer letter not found.");
            }

            var pdf = await _experienceofferLetterService.PreviewOfferLetter(id);
            return File(pdf, "application/pdf");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOfferLetter(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.OfferLetters.FindAsync(id);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound(new { Success = false, Message = "Offer letter not found." });
            }

            await _experienceofferLetterService.DeleteOfferLetterAsync(id);

            return Ok(new
            {
                Success = true,
                Message = "Offer Letter deleted successfully."
            });
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendOfferLetter(SendOfferLetterDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (orgId.HasValue && orgId.Value > 0)
            {
                var letter = await _context.OfferLetters.FindAsync(dto.OfferLetterId);
                if (letter == null || letter.OrganizationId != orgId.Value)
                    return NotFound(new { success = false, message = "Offer letter not found in your organization." });
            }

            try
            {
                await _experienceofferLetterService.SendOfferLetterAsync(dto);

                return Ok(new
                {
                    success = true,
                    message = "Offer Letter Sent Successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("{id}/send-status")]
        public async Task<IActionResult> GetSendStatus(int id)
        {
            var result = await _experienceofferLetterService.GetSendStatusAsync(id);
            return Ok(result);
        }
    }
}