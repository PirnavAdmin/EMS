using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
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

        //---------------------------------------
        // GET ALL OFFER LETTERS (Admin View)
        //---------------------------------------

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


        [HttpGet("salary-structure/{ctc}")]
        public IActionResult GetSalaryStructure(decimal ctc)
        {
            decimal monthlyCTC =
                Math.Round(ctc / 12, 2);

            decimal basic =
                Math.Round(monthlyCTC * 0.3817m, 2);

            decimal hra =
                Math.Round(basic * 0.40m, 2);

            decimal conveyance = 1600;

            decimal medicalAllowance = 1250;

            decimal employerPf =
                Math.Round(basic * 0.12m, 2);

            decimal gross =
                monthlyCTC - employerPf;

            decimal otherAllowance =
                Math.Round(
                    gross - (
                        basic +
                        hra +
                        conveyance +
                        medicalAllowance
                    ),
                    2);

            decimal professionalTax = 200;

            decimal providentFund = employerPf;

            decimal netTakeHome =
                Math.Round(
                    gross - (
                        providentFund +
                        professionalTax
                    ),
                    2);

            return Ok(new
            {
                monthlyCTC,
                basic,
                hra,
                conveyance,
                medicalAllowance,
                otherAllowance,

                // deductions
                providentFund,
                professionalTax,

                // totals
                gross,
                netTakeHome
            });
        }
    }
    }
