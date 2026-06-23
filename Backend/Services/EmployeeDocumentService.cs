using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;


namespace EmployeeManagementSystem.Services
{
    public class EmployeeDocumentService : IEmployeeDocumentService
    {
        private readonly AppDbContext _context;

        public EmployeeDocumentService(
            AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> UploadDocument(
    EmployeeDocumentDto dto)
        {
            if (dto.Files == null || !dto.Files.Any())
                return "Please select at least one file";
            if (string.IsNullOrWhiteSpace(dto.DocumentType))
                return "Please select document type";
            var allowedDocumentTypes = new List<string>
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
            {
                return "Invalid document type";
            }

            var alreadyUploaded = await _context.EmployeeDocuments
                .AnyAsync(x =>
                    x.Employee_Id == dto.EmployeeId &&
                    x.Document_Type == dto.DocumentType);

            if (alreadyUploaded)
            {
                return $"{dto.DocumentType} already uploaded";
            }
            foreach (var file in dto.Files!)
            {
                if (file.Length > 2 * 1024 * 1024)
                    return "File size exceeds 2 MB";
            }

            var allowedExtensions = new[]
            {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    };

            foreach (var file in dto.Files!)
            {
                var extension =
                    Path.GetExtension(file.FileName)
                        .ToLower();
            }

            foreach (var file in dto.Files!)
            {
                var extension =
                    Path.GetExtension(file.FileName)
                        .ToLower();

                if (!allowedExtensions.Contains(extension))
                    return "Only PDF, JPG, JPEG and PNG files are allowed";

                var employeeFolder =
                    Path.Combine(
                        Directory.GetCurrentDirectory(),
                        "wwwroot",
                        "uploads",
                        "employee-documents",
                        dto.EmployeeId);

                if (!Directory.Exists(employeeFolder))
                    Directory.CreateDirectory(employeeFolder);

                var fileName =
                    Guid.NewGuid().ToString() + extension;

                var filePath =
                    Path.Combine(employeeFolder, fileName);

                using (var stream =
                       new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var document = new EmployeeDocument

                {

                    Employee_Id = dto.EmployeeId,

                    Document_Type = dto.DocumentType,

                    File_Name = file.FileName,

                    File_Path =

        $"/uploads/employee-documents/{dto.EmployeeId}/{fileName}",

                    File_Size_MB =

        Math.Round(

            (decimal)file.Length / 1024 / 1024,

            2),

                    Verification_Status = "Pending",

                    Uploaded_Date = DateTime.Now

                };


                _context.EmployeeDocuments.Add(document);
            }

            await _context.SaveChangesAsync();

            return "Documents uploaded successfully";
        }
        public async Task<List<EmployeeDocumentResponseDto>>
        GetEmployeeDocuments(string employeeId)
        {
            var documents = await _context.EmployeeDocuments
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            return documents.Select(x => new EmployeeDocumentResponseDto
            {
                Id = x.Id,
                FileName = x.File_Name,
                DocumentType = x.Document_Type,
                FileType = Path.GetExtension(x.File_Name)
                                .Replace(".", "")
                                .ToUpper(),
                FileSizeMB = x.File_Size_MB,
                UploadedDate = x.Uploaded_Date,
                VerificationStatus = x.Verification_Status
            }).ToList();
        }

        public async Task<byte[]> DownloadDocument(int id)
        {
            var document = await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return Array.Empty<byte>();

            var filePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                document.File_Path.TrimStart('/').Replace("/", "\\"));

            if (!File.Exists(filePath))
                return Array.Empty<byte>();

            return await File.ReadAllBytesAsync(filePath);
        }

        public async Task<string> GetDocumentPath(int id)
        {
            var document = await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return "";

            return document.File_Path;
        }

        public async Task<string> DeleteDocument(int id)
        {
            var document = await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return "Document not found";

            var filePath = Path.Combine(
    Directory.GetCurrentDirectory(),
    "wwwroot",
    document.File_Path
        .TrimStart('/')
        .Replace("/", "\\"));

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }

            _context.EmployeeDocuments.Remove(document);

            await _context.SaveChangesAsync();

            return "Document deleted successfully";
        }
        public async Task<string> VerifyDocument(
      int id,
      string remarks)
        {
            var document = await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return "Document not found";

            document.Verification_Status = "Approved";

            document.Remarks = remarks;

            document.Verified_Date = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Document approved successfully";
        }

        public async Task<string> RejectDocument(
     int id,
     string remarks)
        {
            var document = await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);

            if (document == null)
                return "Document not found";

            document.Verification_Status = "Rejected";

            document.Remarks = remarks;

            document.Verified_Date = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Document rejected successfully";
        }

        public async Task<int> GetPendingDocumentsCount()
        {
            return await _context.EmployeeDocuments
                .CountAsync(x => x.Verification_Status == "Pending");
        }

        public async Task<List<EmployeeDocumentChecklistDto>>
    GetChecklist(string employeeId)
        {
            var requiredDocuments = new List<string>
    {
        "10th Certificate",
        "Intermediate / 12th Certificate",
        "Degree Certificate",
        "Post Graduation Certificate",
        "Aadhaar Card",
        "PAN Card",
        "Passport Size Photo",
        "Offer Letter",
        "Appointment Letter",
        "Relieving Letter",
        "Payslip Month 1",
        "Payslip Month 2",
        "Payslip Month 3"
    };

            var uploadedDocuments = await _context.EmployeeDocuments
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            var result = new List<EmployeeDocumentChecklistDto>();

            foreach (var document in requiredDocuments)
            {
                var uploaded = uploadedDocuments
                    .FirstOrDefault(x => x.Document_Type == document);

                result.Add(new EmployeeDocumentChecklistDto
                {
                    DocumentType = document,
                    Uploaded = uploaded != null,
                    Status = uploaded?.Verification_Status
                });
            }

            return result;
        }
        public async Task<EmployeeDocument?> GetDocumentById(int id)
        {
            return await _context.EmployeeDocuments
                .FirstOrDefaultAsync(x => x.Id == id);
        }
    }
}