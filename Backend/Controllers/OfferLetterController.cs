using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers
{
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class OfferLetterController : ControllerBase
    {
        private readonly IOfferLetterService _offerLetterService;
        private readonly AppDbContext _context;

        //private const string AdminEmail = "admin@ems.com"; // change to your admin email

        public OfferLetterController(
            IOfferLetterService offerLetterService,
            AppDbContext context)
        {
            _offerLetterService = offerLetterService;
            _context = context;
        }

        //---------------------------------------
        // Generate Offer Letter
        //---------------------------------------
        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]
        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] OfferLetterRequestDto dto)
        {
            //var email = User.FindFirst(ClaimTypes.Email)?.Value;

            //if (email != AdminEmail)
            //    return Unauthorized("Only admin can generate offer letters.");

            var result = await _offerLetterService.GenerateAsync(dto);

            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(result.Message);
        }
        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]
        [HttpGet("preview/{id}")]
        public async Task<IActionResult> PreviewOfferLetter(int id)
        {
            var pdf = await _offerLetterService.PreviewOfferLetter(id);

            return File(pdf, "application/pdf");
        }
        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOfferLetter(int id)
        {
            await _offerLetterService.DeleteOfferLetterAsync(id);

            return Ok(new
            {
                Success = true,
                Message = "Offer Letter deleted successfully."
            });
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.Add)]
        [HttpPost("send")]
        public async Task<IActionResult> SendOfferLetter(SendOfferLetterDto dto)
        {
            try
            {
                await _offerLetterService.SendOfferLetterAsync(dto);

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
        //---------------------------------------
        // GET ALL OFFER LETTERS (Admin View)
        //---------------------------------------
        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllOfferLetters()
        {
            //var email = User.FindFirst(ClaimTypes.Email)?.Value;

            //if (email != AdminEmail)
            //    return Unauthorized("Only admin can view offer letters.");

            var letters = await _context.OfferLetters
                .OrderByDescending(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.Candidate_Name,
                    x.Email,
                    x.Position,
                    x.Department,
                    DownloadUrl = $"{Request.Scheme}://{Request.Host}/api/OfferLetter/download/{x.Id}"
                })
                .ToListAsync();

            return Ok(letters);
        }

        //---------------------------------------
        // Download Offer Letter
        //---------------------------------------
        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("download/{id}")]
        public async Task<IActionResult> Download(int id)
        {
            //var email = User.FindFirst(ClaimTypes.Email)?.Value;

            //if (email != AdminEmail)
            //    return Unauthorized("Only admin can download offer letters.");

            var record = await _context.OfferLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (record == null)
                return NotFound("Offer letter not found.");

            if (!System.IO.File.Exists(record.File_Path))
                return NotFound("File not found on server.");

            var bytes = await System.IO.File.ReadAllBytesAsync(record.File_Path);

            return File(bytes,
                "application/pdf",
                Path.GetFileName(record.File_Path));
        }

        [HttpGet("{id}/send-status")]
        public async Task<IActionResult> GetSendStatus(int id)
        {
            var result = await _offerLetterService.GetSendStatusAsync(id);
            return Ok(result);
        }

        //[Permission(ModuleIds.OfferLetters, PermissionAction.View)]
        [HttpGet("salary-structure/{ctc}")]
        public IActionResult GetSalaryStructure(decimal ctc)
        {
            decimal monthlyCTC = Math.Round(ctc / 12, 0, MidpointRounding.AwayFromZero);

            // Earnings
            decimal basic = Math.Round(monthlyCTC * 0.3817m, 0, MidpointRounding.AwayFromZero);

            decimal hra = Math.Round(basic * 0.40m, 0, MidpointRounding.AwayFromZero);

            decimal conveyance = 1600;

            decimal medicalAllowance = 1250;

            // Deductions
            decimal employerPf = Math.Round(basic * 0.12m, 0, MidpointRounding.AwayFromZero);

            decimal professionalTax = 200;

            // Gross Salary
            decimal gross = Math.Round(monthlyCTC - employerPf, 0, MidpointRounding.AwayFromZero);

            // Other Allowance
            decimal otherAllowance = Math.Round(
                gross -
                (
                    basic +
                    hra +
                    conveyance +
                    medicalAllowance
                ),
                0,
                MidpointRounding.AwayFromZero);

            // Net Take Home
            decimal netTakeHome = Math.Round(
                gross -
                (
                    employerPf +
                    professionalTax
                ),
                0,
                MidpointRounding.AwayFromZero);

            return Ok(new
            {
                monthlyCTC = monthlyCTC.ToString("N2"),
                basic = basic.ToString("N2"),
                hra = hra.ToString("N2"),
                conveyance = conveyance.ToString("N2"),
                medicalAllowance = medicalAllowance.ToString("N2"),
                otherAllowance = otherAllowance.ToString("N2"),

                providentFund = employerPf.ToString("N2"),
                professionalTax = professionalTax.ToString("N2"),

                gross = gross.ToString("N2"),
                netTakeHome = netTakeHome.ToString("N2")
            });
        }
    }
    }
   
