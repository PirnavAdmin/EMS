using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppraisalSalaryController : ControllerBase
    {
        private readonly IAppraisalSalaryService _appraisalSalaryService;

        public AppraisalSalaryController(
            IAppraisalSalaryService appraisalSalaryService)
        {
            _appraisalSalaryService = appraisalSalaryService;
        }

        // GET: api/AppraisalSalary/{employeeId}/{appraisalId}
        [HttpGet("{employeeId}/{appraisalId}")]
        public async Task<IActionResult> GetRevisedSalary(
            string employeeId,
            int appraisalId)
        {
            var result =
                await _appraisalSalaryService.GetRevisedSalaryAsync(
                    employeeId,
                    appraisalId);

            if (result == null)
            {
                return NotFound(new
                {
                    message =
                        "Completed appraisal or active salary structure not found."
                });
            }

            return Ok(result);
        }

        // POST: api/AppraisalSalary/save
        [HttpPost("save")]
        public async Task<IActionResult> SaveRevisedSalary(
            [FromBody] AppraisalSalaryDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new
                {
                    message = "Salary details are required."
                });
            }

            try
            {
                var result =
                    await _appraisalSalaryService.SaveRevisedSalaryAsync(dto);

                if (result == null)
                {
                    return NotFound(new
                    {
                        message =
                            "Completed appraisal or active salary structure not found."
                    });
                }

                return Ok(new
                {
                    message =
                        "Revised salary structure saved successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

       
        // POST: api/AppraisalSalary/generate-letter/{appraisalId}
        [HttpPost("generate-letter/{appraisalId}")]
        public async Task<IActionResult> GenerateAppraisalLetter(
            int appraisalId)
        {
            try
            {
                var pdfPath = await _appraisalSalaryService
     .GenerateAppraisalLetterAsync(appraisalId);

                var fileName = Path.GetFileName(pdfPath);

                return PhysicalFile(
                    pdfPath,
                    "application/pdf",
                    fileName);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Failed to generate appraisal letter.",
                    error = ex.Message
                });
            }
        }
        [HttpGet("download/{appraisalId}")]
        public async Task<IActionResult> DownloadAppraisalLetter(int appraisalId)
        {
            try
            {
                // IMPORTANT:
                // Download must NOT generate the letter again.
                // It should only locate the already generated PDF.
                var pdfPath = await _appraisalSalaryService
                    .GetAppraisalLetterPathAsync(appraisalId);

                if (string.IsNullOrWhiteSpace(pdfPath))
                {
                    return NotFound(new
                    {
                        message = "Hike letter has not been generated yet."
                    });
                }

                if (!System.IO.File.Exists(pdfPath))
                {
                    return NotFound(new
                    {
                        message = "Generated hike letter file was not found."
                    });
                }

                var fileName = Path.GetFileName(pdfPath);

                return PhysicalFile(
                    pdfPath,
                    "application/pdf",
                    fileName);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Failed to download appraisal letter.",
                    error = ex.Message
                });
            }
        }   // POST: api/AppraisalSalary/send-email/{appraisalId}
        [HttpPost("send-email/{appraisalId}")]
        public async Task<IActionResult> SendAppraisalLetterEmail(
            int appraisalId)
        {
            try
            {
                await _appraisalSalaryService
                    .SendAppraisalLetterEmailAsync(appraisalId);

                return Ok(new
                {
                    message = "Appraisal letter sent successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Failed to send appraisal letter.",
                    error = ex.Message
                });
            }
        }
    }
}