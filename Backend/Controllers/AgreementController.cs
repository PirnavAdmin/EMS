using DocumentFormat.OpenXml.Spreadsheet;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Services;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

using Microsoft.AspNetCore.Hosting;


namespace EmployeeManagementSystem.Controllers

{

    //[Authorize]

    [Route("api/[controller]")]

    [ApiController]

    public class AgreementController : ControllerBase

    {

        private readonly IAgreementService _agreementService;

        private readonly IWebHostEnvironment _environment;

        public AgreementController(

            IAgreementService agreementService,

            IWebHostEnvironment environment)

        {

            _agreementService = agreementService;

            _environment = environment;

        }

        [HttpPost("upload")]

        public async Task<IActionResult> UploadAgreement([FromForm] UploadAgreementDto dto)

        {

            var result = await _agreementService.UploadAgreement(dto);

            return Ok(result);

        }


        [HttpGet("myagreements")]

        public async Task<IActionResult> GetMyAgreements()

        {

            var employeeId = User.FindFirst("EmployeeId")?.Value;

            if (string.IsNullOrEmpty(employeeId))

            {

                return Unauthorized(new

                {

                    Status = false,

                    Message = "Invalid token."

                });

            }

            var result = await _agreementService.GetMyAgreements(employeeId);

            return Ok(result);

        }

        [HttpGet("filepath/{agreementId}")]

        public async Task<IActionResult> GetAgreementFilePath(int agreementId)

        {

            var result = await _agreementService.GetAgreementFilePath(agreementId);

            if (string.IsNullOrEmpty(result))

            {

                return NotFound("Agreement not found.");

            }

            return Ok(result);

        }

        [HttpPost("sign")]

        public async Task<IActionResult> SignAgreement(SignAgreementDto dto)

        {

            var result = await _agreementService.SignAgreement(dto);

            return Ok(result);

        }

        //[Authorize(Roles = "Admin,HR")]

        [HttpGet("admin/status")]

        public async Task<IActionResult> GetAgreementStatus()

        {

            var result = await _agreementService.GetAgreementStatus();

            return Ok(result);

        }


        // [Authorize(Roles = "Admin,HR")]

        [HttpGet("download/{agreementId}")]

        public async Task<IActionResult> DownloadAgreement(int agreementId)

        {

            var agreement = await _agreementService.GetAgreementById(agreementId);

            if (agreement == null)

                return NotFound("Agreement not found.");

            var filePath = Path.Combine(

                _environment.WebRootPath,

                agreement.FilePath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!System.IO.File.Exists(filePath))

                return NotFound("File not found.");

            var bytes = await System.IO.File.ReadAllBytesAsync(filePath);

            return File(bytes, "application/pdf", agreement.FileName);

        }
        [HttpGet("view/{employeeAgreementId}")]
        public async Task<IActionResult> ViewAgreement(int employeeAgreementId)
        {
            var result = await _agreementService
                .ViewAgreement(employeeAgreementId);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Agreement not found."
                });
            }

            var file = result.Value;

            return File(
                file.FileBytes,
                file.ContentType,
                file.FileName
            );
        }

        [HttpGet("DownloadSigned/{employeeAgreementId}")]

        public async Task<IActionResult> DownloadSigned(int employeeAgreementId)

        {

            var file = await _agreementService.DownloadSignedAgreement(employeeAgreementId);

            if (file == null)

                return NotFound();

            return PhysicalFile(file, "application/pdf", Path.GetFileName(file));

        }

        [HttpGet("ViewSigned/{employeeAgreementId}")]

        public async Task<IActionResult> ViewSigned(int employeeAgreementId)

        {

            var file = await _agreementService.ViewSignedAgreement(employeeAgreementId);

            if (file == null)

                return NotFound();

            return PhysicalFile(file, "application/pdf");

        }

        [HttpGet("Pending/{employeeId}")]

        public async Task<IActionResult> Pending(string employeeId)

        {

            return Ok(await _agreementService.GetPendingAgreements(employeeId));

        }

        [HttpGet("Signed/{employeeId}")]

        public async Task<IActionResult> Signed(string employeeId)

        {

            return Ok(await _agreementService.GetSignedAgreements(employeeId));

        }


        [HttpGet("GetAllAgreements")]
        public async Task<IActionResult> GetAllAgreements()
        {
            var result = await _agreementService.GetAllAgreements();

            return Ok(result);
        }
        [HttpGet("AdminReport")]

        public async Task<IActionResult> AdminReport()

        {

            return Ok(await _agreementService.GetAgreementReport());

        }


        [HttpGet("download")]

        public async Task<IActionResult> DownloadAgreement(

    string employeeId,

    string agreementCode)

        {

            var file = await _agreementService.DownloadAgreement(employeeId, agreementCode);

            if (file == null)

                return NotFound();

            return file;

        }

    }

}
