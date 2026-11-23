using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OnboardingDocumentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OnboardingDocumentsController(AppDbContext context)
        {
            _context = context;
        }

        // ============================================
        // Upload Documents
        // ============================================
        [HttpPost("upload")]
        public async Task<IActionResult> UploadDocument([FromForm] OnboardingDocumentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.OnboardingId))
                return BadRequest("Onboarding Id is required.");

            var candidate = await _context.OnboardingCandidates
                .FirstOrDefaultAsync(x => x.OnboardingId == dto.OnboardingId);

            if (candidate == null)
                return BadRequest("Invalid Onboarding Id.");

            if (dto.File == null || dto.File.Length == 0)
                return BadRequest("Please select a file.");

            if (string.IsNullOrWhiteSpace(dto.DocumentType))
                return BadRequest("Please select document type.");

            var allowedDocumentTypes = new[]
            {
        "10th Certificate",
        "Intermediate / 12th Certificate",
        "Degree Certificate",
        "Post Graduation Certificate",
        "Aadhaar Card",
        "PAN Card",
        "Passport",
        "Passport Size Photo",
        "Offer Letter",
        "Appointment Letter",
        "Relieving Letter",
        "Payslip Month 1",
        "Payslip Month 2",
        "Payslip Month 3"
    };

            if (!allowedDocumentTypes.Contains(dto.DocumentType))
                return BadRequest("Invalid document type.");

            var alreadyUploaded = await _context.OnboardingDocuments
                .AnyAsync(x =>
                    x.OnboardingId == dto.OnboardingId &&
                    x.DocumentType == dto.DocumentType);

            if (alreadyUploaded)
                return BadRequest($"{dto.DocumentType} has already been uploaded.");

            var file = dto.File;

            // Maximum 5 MB
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest("File size should not exceed 5 MB.");

            var allowedExtensions = new[]
            {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                return BadRequest("Only PDF, JPG, JPEG and PNG files are allowed.");

            var uploadFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "onboarding-documents",
                dto.OnboardingId);

            if (!Directory.Exists(uploadFolder))
            {
                Directory.CreateDirectory(uploadFolder);
            }

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var physicalPath = Path.Combine(uploadFolder, uniqueFileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var document = new OnboardingDocument
            {
                OnboardingId = dto.OnboardingId,
                DocumentType = dto.DocumentType,
                FileName = file.FileName,
                FilePath = $"/uploads/onboarding-documents/{dto.OnboardingId}/{uniqueFileName}",
                UploadedOn = DateTime.UtcNow
            };

            _context.OnboardingDocuments.Add(document);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Document uploaded successfully.",
                document.Id,
                document.DocumentType,
                document.FileName,
                document.FilePath,
                document.UploadedOn
            });
        }    // ============================================
        // Get All Documents By Onboarding Id
        // ============================================
        [HttpGet("{onboardingId}")]
        public async Task<IActionResult> GetDocuments(string onboardingId)
        {
            var documents = await _context.OnboardingDocuments
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            var result = documents.Select(x => new
            {
                x.Id,
                FileName = x.FileName,
                DocumentType = x.DocumentType,
                FileType = Path.GetExtension(x.FileName)
                                .Replace(".", "")
                                .ToUpper(),
                
            }).ToList();

            return Ok(result);
        }

        // ============================================
        // Download Document
        // ============================================
        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadDocument(int id)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return NotFound("Document not found.");

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.FilePath
                    .TrimStart('/')
                    .Replace("/", "\\"));

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found.");

            var bytes = await System.IO.File.ReadAllBytesAsync(filePath);

            var extension = Path.GetExtension(document.FileName).ToLower();

            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                _ => "application/octet-stream"
            };

            return File(
                bytes,
                contentType,
                document.FileName);
        }

        // ============================================
        // View Document
        // ============================================
        [HttpGet("view/{id}")]
        public async Task<IActionResult> ViewDocument(int id)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return NotFound("Document not found.");

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.FilePath.TrimStart('/'));

            if (!System.IO.File.Exists(filePath))
                return NotFound("File not found.");

            var extension = Path.GetExtension(document.FileName).ToLower();

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
        // ============================================
        // Delete Document
        // ============================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
            {
                return NotFound(new
                {
                    message = "Document not found."
                });
            }

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.FilePath.TrimStart('/').Replace("/", "\\"));

            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            _context.OnboardingDocuments.Remove(document);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Document deleted successfully."
            });
        }

        // ============================================
        // Verify Document
        // ============================================
        [HttpPut("verify/{id}")]
        public async Task<IActionResult> VerifyDocument(
            int id,
            [FromBody] DocumentVerificationDto dto)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
            {
                return NotFound(new
                {
                    message = "Document not found."
                });
            }

          

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Document approved successfully."
            });
        }

        // ============================================
        // Reject Document
        // ============================================
        [HttpPut("reject/{id}")]
        public async Task<IActionResult> RejectDocument(
            int id,
            [FromBody] DocumentVerificationDto dto)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
            {
                return NotFound(new
                {
                    message = "Document not found."
                });
            }

           

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Document rejected successfully."
            });
        }

      

        // ============================================
        // Document Checklist
        // ============================================
        [HttpGet("checklist/{onboardingId}")]
        public async Task<IActionResult> GetChecklist(string onboardingId)
        {
            var requiredDocuments = new List<string>
            {
                "10th Certificate",
                "Intermediate / 12th Certificate",
                "Degree Certificate",
                "Post Graduation Certificate",
                "Aadhaar Card",
                "PAN Card",
                "Passport",
                "Passport Size Photo",
                "Offer Letter",
                "Appointment Letter",
                "Relieving Letter",
                "Payslip Month 1",
                "Payslip Month 2",
                "Payslip Month 3"
            };

            var uploadedDocuments = await _context.OnboardingDocuments
                .Where(x => x.OnboardingId == onboardingId)
                .ToListAsync();

            var result = new List<object>();

            foreach (var document in requiredDocuments)
            {
                var uploaded = uploadedDocuments
                    .FirstOrDefault(x => x.DocumentType == document);

                result.Add(new
                {
                    DocumentType = document,
                    Uploaded = uploaded != null,
                    
                });
            }

            return Ok(result);
        }

        // ============================================
        // Get Document By Id
        // ============================================
        [HttpGet("document/{id}")]
        public async Task<IActionResult> GetDocumentById(int id)
        {
            var document = await _context.OnboardingDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
            {
                return NotFound(new
                {
                    message = "Document not found."
                });
            }

            return Ok(document);
        }
    }
}