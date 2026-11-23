using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DocumentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DocumentController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetDocuments()
        {
            return Ok(await _context.DocumentMaster
                .OrderByDescending(x => x.DocumentId)
                .ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> UploadDocument(
            IFormFile file,
            string documentName,
            string category,
            string version,
            bool isEmployeeVisible,
            int companyId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Please select a document.");

            var uploadFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "uploads",
                "documents");

            if (!Directory.Exists(uploadFolder))
                Directory.CreateDirectory(uploadFolder);

            var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var document = new DocumentMaster
            {
                Company_Id = companyId,
                DocumentName = documentName,
                Category = category,
                FileName = file.FileName,
                FilePath = "/uploads/documents/" + fileName,
                Version = version,
                IsEmployeeVisible = isEmployeeVisible,
                CreatedDate = DateTime.Now
            };

            _context.DocumentMaster.Add(document);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Document uploaded successfully.",
                DocumentId = document.DocumentId,
                DocumentPath = document.FilePath
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var document = await _context.DocumentMaster.FindAsync(id);

            if (document == null)
                return NotFound();

            _context.DocumentMaster.Remove(document);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }

        [HttpGet("download/{id}")]
        public async Task<IActionResult> DownloadDocument(int id)
        {
            var document = await _context.DocumentMaster.FindAsync(id);

            if (document == null)
                return NotFound();

            var path = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.FilePath.TrimStart('/'));

            if (!System.IO.File.Exists(path))
                return NotFound("File not found.");

            return PhysicalFile(
                path,
                "application/octet-stream",
                document.FileName);
        }
    }
}