using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeDocumentsController : ControllerBase
    {
        private readonly IEmployeeDocumentService _service;
        private readonly AppDbContext _context;

        public EmployeeDocumentsController(
            IEmployeeDocumentService service,
            AppDbContext context)
        {
            _service = service;
            _context = context;
        }

        private async Task<bool> IsAdminUser()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrWhiteSpace(email))
                return false;

            return await _context.Admins
                .AnyAsync(a => a.Email == email);
        }


        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument(
            [FromForm] EmployeeDocumentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool isAdmin = await IsAdminUser();

            string employeeId;

            if (isAdmin)
            {
                // Admin can upload documents for any employee
                if (string.IsNullOrWhiteSpace(dto.EmployeeId))
                    return BadRequest("Employee Id is required.");

                employeeId = dto.EmployeeId;

                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
                if (!inTenant)
                    return NotFound("Employee not found in your organization.");
            }
            else
            {
                // Employee or Onboarding Candidate
                employeeId = User.FindFirst("EmployeeId")?.Value
                            ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(employeeId))
                    return Unauthorized("Invalid user.");

                // Ignore EmployeeId from frontend
                dto.EmployeeId = employeeId;
            }

            var result = await _service.UploadDocument(dto);

            return Ok(new
            {
                message = result
            });
        }
        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeDocuments(string employeeId)
        {
            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, employeeId, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can view only your own documents.");
                }
            }
            else
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
                if (!inTenant)
                    return NotFound("Employee not found in your organization.");
            }

            var result = await _service.GetEmployeeDocuments(employeeId);

            return Ok(result);
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadDocument(int id)
        {
            var document = await _service.GetDocumentById(id);

            if (document == null)
                return NotFound("Document not found");

            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, document.Employee_Id, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can download only your own documents.");
                }
            }
            else
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, document.Employee_Id);
                if (!inTenant)
                    return NotFound("Document not found in your organization.");
            }

            var fileBytes = await _service.DownloadDocument(id);

            if (fileBytes.Length == 0)
                return NotFound("File not found");

            return File(
                fileBytes,
                "application/pdf",
                document.File_Name ?? $"Document_{id}.pdf");
        }

        [HttpGet("view/{id}")]
        public async Task<IActionResult> ViewDocument(int id)
        {
            var document = await _service.GetDocumentById(id);

            if (document == null)
                return NotFound("Document not found");

            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, document.Employee_Id, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can view only your own documents.");
                }
            }
            else
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, document.Employee_Id);
                if (!inTenant)
                    return NotFound("Document not found in your organization.");
            }

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.File_Path.TrimStart('/'));

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found");

            var extension = Path.GetExtension(document.File_Name).ToLower();

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
            var document = await _service.GetDocumentById(id);

            if (document == null)
                return NotFound(new
                {
                    message = "Document not found"
                });

            bool isAdmin = await IsAdminUser();

            if (!isAdmin)
            {
                var currentId = User.FindFirst("EmployeeId")?.Value
                             ?? User.FindFirst("OnboardingId")?.Value;

                if (string.IsNullOrWhiteSpace(currentId))
                    return Unauthorized("Invalid user.");

                if (!string.Equals(currentId, document.Employee_Id, StringComparison.OrdinalIgnoreCase))
                {
                    return Forbid("You can delete only your own documents.");
                }
            }
            else
            {
                bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, document.Employee_Id);
                if (!inTenant)
                    return NotFound(new { message = "Document not found in your organization." });
            }

            var result = await _service.DeleteDocument(id);

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
            var doc = await _service.GetDocumentById(id);
            if (doc == null)
                return NotFound(new { message = "Document not found" });

            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, doc.Employee_Id);
            if (!inTenant)
                return NotFound(new { message = "Document not found in your organization" });

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
            var doc = await _service.GetDocumentById(id);
            if (doc == null)
                return NotFound(new { message = "Document not found" });

            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, doc.Employee_Id);
            if (!inTenant)
                return NotFound(new { message = "Document not found in your organization" });

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
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var tenantEmpIds = CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                .Select(e => e.Employee_Id);

            var count = await _context.EmployeeDocuments
                .Where(x => tenantEmpIds.Contains(x.Employee_Id) && x.Verification_Status == "Pending")
                .CountAsync();

            return Ok(new
            {
                pendingCount = count
            });
        }

        [HttpGet("checklist/{employeeId}")]
        public async Task<IActionResult> GetChecklist(string employeeId)
        {
            employeeId = Uri.UnescapeDataString(employeeId).Trim();
            bool inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
            if (!inTenant)
                return NotFound(new { message = "Employee not found in your organization" });

            var data =
                await _service.GetChecklist(employeeId);

            return Ok(data);
        }

    }
}