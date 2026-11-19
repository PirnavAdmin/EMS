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

                    GeneratedDate = x.Generated_On, //varsha

                    Generated_On = x.Generated_On, //varsha

                    Joining_Date = x.Joining_Date, //varsha

                    x.Status, //varsha

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

        public IActionResult GetSalaryStructure(

            decimal ctc,

            [FromQuery] decimal pfPercentage = 12m,

            [FromQuery] decimal? basic = null,

            [FromQuery] decimal? hra = null,

            [FromQuery] decimal? conveyance = null,

            [FromQuery] decimal? medicalAllowance = null,

            [FromQuery] decimal? professionalTax = null,

            [FromQuery] decimal? providentFund = null)

        {

            // =====================================

            // VALIDATIONS

            // =====================================

            if (ctc <= 0)

                return BadRequest("Annual CTC must be greater than zero.");

            if (pfPercentage < 0 || pfPercentage > 100)

                return BadRequest("PF percentage must be between 0 and 100.");

            if (basic < 0 || hra < 0 ||

                conveyance < 0 || medicalAllowance < 0 ||

                professionalTax < 0)

            {

                return BadRequest("Salary components cannot be negative.");

            }

            if (providentFund < 0)

                return BadRequest("Provident Fund cannot be negative.");

            // =====================================

            // CTC CALCULATION

            // =====================================

            decimal monthlyCTC = Math.Round(

                ctc / 12,

                0,

                MidpointRounding.AwayFromZero);

            // =====================================

            // EARNINGS

            // =====================================

            decimal calculatedBasic = basic ?? Math.Round(

                monthlyCTC * 0.3817m,

                0,

                MidpointRounding.AwayFromZero);

            decimal calculatedHra = hra ?? Math.Round(

                calculatedBasic * 0.40m,

                0,

                MidpointRounding.AwayFromZero);

            decimal calculatedConveyance = conveyance ?? 1600m;

            decimal calculatedMedicalAllowance =

                medicalAllowance ?? 1250m;

            // =====================================

            // PF CALCULATION

            // =====================================

            decimal employerPf;

            decimal calculatedPfPercentage;

            if (providentFund.HasValue)

            {

                // PF Amount was manually edited

                employerPf = providentFund.Value;

                calculatedPfPercentage = calculatedBasic > 0

                    ? Math.Round(

                        employerPf / calculatedBasic * 100m,

                        2,

                        MidpointRounding.AwayFromZero)

                    : 0m;

            }

            else

            {

                // PF Percentage is the source

                calculatedPfPercentage = pfPercentage;

                employerPf = Math.Round(

                    calculatedBasic * calculatedPfPercentage / 100m,

                    0,

                    MidpointRounding.AwayFromZero);

            }

            decimal calculatedProfessionalTax =

                professionalTax ?? 200m;

            // =====================================

            // GROSS SALARY

            // =====================================

            decimal gross = Math.Round(

                monthlyCTC - employerPf,

                0,

                MidpointRounding.AwayFromZero);

            // =====================================

            // OTHER ALLOWANCE AUTO BALANCING

            // =====================================

            decimal otherAllowance = Math.Round(

                gross -

                (

                    calculatedBasic +

                    calculatedHra +

                    calculatedConveyance +

                    calculatedMedicalAllowance

                ),

                0,

                MidpointRounding.AwayFromZero);

            // =====================================

            // NET TAKE HOME

            // =====================================

            decimal netTakeHome = Math.Round(

                gross - (employerPf + calculatedProfessionalTax),

                0,

                MidpointRounding.AwayFromZero);

            // =====================================

            // YEARLY CALCULATIONS

            // =====================================

            decimal annualGross = gross * 12;

            decimal annualBasic = calculatedBasic * 12;

            decimal annualHra = calculatedHra * 12;

            decimal annualConveyance = calculatedConveyance * 12;

            decimal annualMedicalAllowance = calculatedMedicalAllowance * 12;

            decimal annualOtherAllowance = otherAllowance * 12;

            decimal annualPf = employerPf * 12;

            decimal annualProfessionalTax = calculatedProfessionalTax * 12;

            decimal annualNetTakeHome = netTakeHome * 12;

            return Ok(new

            {

                annualCTC = ctc.ToString("N2"),

                monthlyCTC = monthlyCTC.ToString("N2"),

                pfPercentage = calculatedPfPercentage.ToString("N2"),

                basic = calculatedBasic.ToString("N2"),

                basicYearly = annualBasic.ToString("N2"),

                hra = calculatedHra.ToString("N2"),

                hraYearly = annualHra.ToString("N2"),

                conveyance = calculatedConveyance.ToString("N2"),

                conveyanceYearly = annualConveyance.ToString("N2"),

                medicalAllowance = calculatedMedicalAllowance.ToString("N2"),

                medicalAllowanceYearly = annualMedicalAllowance.ToString("N2"),

                otherAllowance = otherAllowance.ToString("N2"),

                otherAllowanceYearly = annualOtherAllowance.ToString("N2"),

                providentFund = employerPf.ToString("N2"),

                providentFundYearly = annualPf.ToString("N2"),

                professionalTax = calculatedProfessionalTax.ToString("N2"),

                professionalTaxYearly = annualProfessionalTax.ToString("N2"),

                gross = gross.ToString("N2"),

                grossYearly = annualGross.ToString("N2"),

                netTakeHome = netTakeHome.ToString("N2"),

                netTakeHomeYearly = annualNetTakeHome.ToString("N2")

            });

        }

    }

}

