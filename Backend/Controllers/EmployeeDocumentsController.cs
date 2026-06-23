using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeDocumentsController : ControllerBase
    {
        private readonly IEmployeeDocumentService _service;

        public EmployeeDocumentsController(
            IEmployeeDocumentService service)
        {
            _service = service;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument(
            [FromForm] EmployeeDocumentDto dto)
        {
            var result =
                await _service.UploadDocument(dto);

            return Ok(new
            {
                message = result
            });
        }

      
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeDocuments(string employeeId)
        {
            var result = await _service.GetEmployeeDocuments(employeeId);
            return Ok(result);
        }

        [HttpGet("download/{id}")]

        public async Task<IActionResult> DownloadDocument(int id)

        {

            var fileBytes =

                await _service.DownloadDocument(id);

            if (fileBytes.Length == 0)

                return NotFound("File not found");

            var document =

                await _service.GetDocumentById(id);

            return File(

                fileBytes,

                "application/pdf",

                document?.File_Name ?? $"Document_{id}.pdf");

        }


        [HttpGet("view/{id}")]
        public async Task<IActionResult> ViewDocument(int id)
        {
            var document = await _service.GetDocumentById(id);

            if (document == null)
                return NotFound("Document not found");

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.File_Path.TrimStart('/'));

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found");

            var extension = Path.GetExtension(document.File_Name)
                .ToLower();

            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                _ => "application/octet-stream"
            };

            return PhysicalFile(filePath, contentType);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var result =
                await _service.DeleteDocument(id);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpPut("verify/{id}")]
        public async Task<IActionResult> VerifyDocument(
    int id,
    [FromBody] DocumentVerificationDto dto)
        {
            var result =
                await _service.VerifyDocument(
                    id,
                    dto.Remarks);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpPut("reject/{id}")]
        public async Task<IActionResult> RejectDocument(
    int id,
    [FromBody] DocumentVerificationDto dto)
        {
            var result =
                await _service.RejectDocument(
                    id,
                    dto.Remarks);

            if (result == "Document not found")
                return NotFound(new
                {
                    message = result
                });

            return Ok(new
            {
                message = result
            });
        }

        [HttpGet("pending-count")]
        public async Task<IActionResult> GetPendingCount()
        {
            var count =
                await _service.GetPendingDocumentsCount();

            return Ok(new
            {
                pendingCount = count
            });
        }

        [HttpGet("checklist/{employeeId}")]
        public async Task<IActionResult> GetChecklist(
    string employeeId)
        {
            var data =
                await _service.GetChecklist(employeeId);

            return Ok(data);
        }

    }
}