using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using Org.BouncyCastle.Crypto.Agreement;

namespace EmployeeManagementSystem.Services

{

    public class AgreementService : IAgreementService

    {

        private readonly AppDbContext _context;

        private readonly IWebHostEnvironment _environment;

        private readonly IAgreementTemplateService _agreementTemplateService;

        public AgreementService(AppDbContext context,

                                IWebHostEnvironment environment,

                               IAgreementTemplateService agreementTemplateService)

        {

            _context = context;

            _environment = environment;

            _agreementTemplateService = agreementTemplateService;

        }

        public async Task<object> UploadAgreement(UploadAgreementDto dto)

        {

            if (dto.File == null || dto.File.Length == 0)

            {

                return new

                {

                    Status = false,

                    Message = "Please select a file."

                };

            }

            var extension = Path.GetExtension(dto.File.FileName).ToLower();

            if (extension != ".docx")

            {

                return new

                {

                    Status = false,

                    Message = "Only DOCX files are allowed."

                };

            }

            if (dto.File.Length > 25 * 1024 * 1024)

            {

                return new

                {

                    Status = false,

                    Message = "File size should not exceed 25 MB."

                };

            }

            // Create Agreements folder

            var folderPath = Path.Combine(_environment.WebRootPath, "Agreements");

            if (!Directory.Exists(folderPath))

            {

                Directory.CreateDirectory(folderPath);

            }

            // Create unique file name
            var fileName = Path.GetFileName(dto.File.FileName);

            var filePath = Path.Combine(folderPath, fileName);

            // Save file

            using (var stream = new FileStream(filePath, FileMode.Create))

            {

                await dto.File.CopyToAsync(stream);

            }

            var agreementCodeExists = await _context.AgreementMasters

    .AnyAsync(x => x.AgreementCode == dto.AgreementCode);

            if (agreementCodeExists)

            {

                return new

                {

                    Status = false,

                    Message = "Agreement Code already exists."

                };

            }

            var agreementNameExists = await _context.AgreementMasters

    .AnyAsync(x => x.AgreementName == dto.AgreementName);

            if (agreementNameExists)

            {

                return new

                {

                    Status = false,

                    Message = "Agreement Name already exists."

                };

            }

            var agreement = new AgreementMaster

            {

                AgreementCode = dto.AgreementCode,

                AgreementName = dto.AgreementName,

                Description = dto.Description,

                FileName = dto.File.FileName,

                FilePath = "/Agreements/" + fileName,

                Version = "1.0",

                IsMandatory = dto.IsMandatory,

                AssignToExistingEmployees = dto.AssignToExistingEmployees,

                IsActive = dto.IsActive,

                CreatedDate = DateTime.Now

            };

            _context.AgreementMasters.Add(agreement);

            await _context.SaveChangesAsync();

            if (dto.AssignToExistingEmployees)

            {

                var employees = await _context.Employees

                    .Where(x => x.Status == "Active")

                    .ToListAsync();

                foreach (var employee in employees)

                {

                    var employeeAgreement = new EmployeeAgreement

                    {

                        Employee_Id = employee.Employee_Id,

                        AgreementId = agreement.AgreementId,

                        AgreementName = agreement.AgreementName,

                        AgreementVersion = agreement.Version,

                        SignatureName = "",

                        Status = "Pending",

                        CreatedDate = DateTime.Now

                    };

                    _context.EmployeeAgreements.Add(employeeAgreement);

                }

                await _context.SaveChangesAsync();

            }

            return new

            {

                Status = true,

                Message = "Agreement uploaded successfully."

            };

        }

        public async Task<object> GetAllAgreements()
        {
            var agreements = await _context.AgreementMasters
                .OrderByDescending(x => x.CreatedDate)
                .Select(x => new
                {
                    AgreementId = x.AgreementId,
                    AgreementCode = x.AgreementCode,
                    AgreementName = x.AgreementName,
                    Description = x.Description,
                    FileName = x.FileName,
                    FilePath = x.FilePath,
                    Version = x.Version,
                    IsMandatory = x.IsMandatory,
                    AssignToExistingEmployees = x.AssignToExistingEmployees,
                    IsActive = x.IsActive,
                    CreatedDate = x.CreatedDate
                })
                .ToListAsync();

            return new
            {
                Status = true,
                Message = agreements.Any()
                    ? "Agreements fetched successfully."
                    : "No agreements found.",
                Data = agreements
            };
        }

        public async Task<List<EmployeeAgreementDto>> GetMyAgreements(string employeeId)

        {

            var agreements = await (

    from ea in _context.EmployeeAgreements

    join am in _context.AgreementMasters

        on ea.AgreementId equals am.AgreementId

    where ea.Employee_Id == employeeId

    select new EmployeeAgreementDto

    {

        EmployeeAgreementId = ea.EmployeeAgreementId,

        AgreementCode = am.AgreementCode,

        AgreementName = am.AgreementName,

        AgreementVersion = ea.AgreementVersion,

        Status = ea.Status,

        SignedOn = ea.SignedOn,

        DownloadUrl = ea.SignedPdfPath

    }).ToListAsync();

            return agreements;

        }

        public async Task<string?> GetAgreementFilePath(int agreementId)

        {

            var agreement = await _context.AgreementMasters

                .FirstOrDefaultAsync(x => x.AgreementId == agreementId);

            if (agreement == null)

                return null;

            return agreement.FilePath;

        }

        public async Task<object> SignAgreement(SignAgreementDto dto)
        {
            // Find agreement using AgreementCode
            var agreement = await _context.AgreementMasters
                .FirstOrDefaultAsync(x => x.AgreementCode == dto.AgreementCode);

            if (agreement == null)
            {
                return new
                {
                    Status = false,
                    Message = "Invalid Agreement Code."
                };
            }

            // Find employee agreement using AgreementId
            var employeeAgreement = await _context.EmployeeAgreements
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == dto.EmployeeId &&
                    x.AgreementId == agreement.AgreementId);

            if (employeeAgreement == null)
            {
                return new
                {
                    Status = false,
                    Message = "Agreement not assigned to employee."
                };
            }

            // Get employee
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.EmployeeId);

            if (employee == null)
            {
                return new
                {
                    Status = false,
                    Message = "Employee not found."
                };
            }

            // Get personal info
            var personalInfo = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.EmployeeId);

            if (personalInfo == null)
            {
                return new
                {
                    Status = false,
                    Message = "Employee personal information not found."
                };
            }

            // Validate Signature Image
            if (dto.SignatureImage == null || dto.SignatureImage.Length == 0)
            {
                return new
                {
                    Status = false,
                    Message = "Please upload a signature image."
                };
            }

            // Allowed image extensions
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp" };

            var extension = Path.GetExtension(dto.SignatureImage.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
            {
                return new
                {
                    Status = false,
                    Message = "Only image files (.jpg, .jpeg, .png, .bmp, .gif, .webp) are allowed."
                };
            }

            // Validate MIME Type
            if (string.IsNullOrWhiteSpace(dto.SignatureImage.ContentType) ||
                !dto.SignatureImage.ContentType.StartsWith("image/"))
            {
                return new
                {
                    Status = false,
                    Message = "Invalid file type. Please upload a valid image."
                };
            }

            // Update agreement details
            employeeAgreement.SignatureName = dto.SignatureName;
            employeeAgreement.SignedLocation = dto.SignedLocation;
            employeeAgreement.SignedOn = DateTime.Now;
            employeeAgreement.Status = "Signed";

            // Create Signatures folder if it doesn't exist
            var signatureFolder = Path.Combine(_environment.WebRootPath, "Signatures");

            if (!Directory.Exists(signatureFolder))
            {
                Directory.CreateDirectory(signatureFolder);
            }

            // Save signature image
            var fileName = $"{dto.EmployeeId}_{dto.AgreementCode}{extension}";
            var filePath = Path.Combine(signatureFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.SignatureImage.CopyToAsync(stream);
            }

            employeeAgreement.SignatureImagePath = "/Signatures/" + fileName;

            // Generate signed agreement PDF
            var generatedDoc = await _agreementTemplateService.GenerateAgreementAsync(
                agreement,
                employeeAgreement,
                employee,
                personalInfo);

            employeeAgreement.SignedPdfPath = generatedDoc;

            await _context.SaveChangesAsync();

            return new
            {
                Status = true,
                Message = "Agreement signed successfully."
            };
        }
        public async Task<List<AgreementStatusDto>> GetAgreementStatus()

        {

            var result = await (from ea in _context.EmployeeAgreements

                                join e in _context.Employees

                                    on ea.Employee_Id equals e.Employee_Id

                                join am in _context.AgreementMasters

                                    on ea.AgreementId equals am.AgreementId

                                select new AgreementStatusDto

                                {

                                    EmployeeAgreementId = ea.EmployeeAgreementId,

                                    EmployeeId = ea.Employee_Id,

                                    EmployeeName = e.Name,

                                    AgreementCode = am.AgreementCode,

                                    AgreementName = am.AgreementName,

                                    Status = ea.Status,

                                    SignatureName = ea.SignatureName,

                                    SignedLocation = ea.SignedLocation,

                                    SignedOn = ea.SignedOn

                                }).ToListAsync();

            return result;

        }

        public async Task<AgreementMaster?> GetAgreementById(int agreementId)

        {

            return await _context.AgreementMasters

                .FirstOrDefaultAsync(x => x.AgreementId == agreementId);

        }
        public async Task<(
      byte[] FileBytes,
      string ContentType,
      string FileName)?> ViewAgreement(
          int employeeAgreementId)
        {
            var agreement = await _context.EmployeeAgreements
                .Include(x => x.AgreementMaster)
                .FirstOrDefaultAsync(x =>
                    x.EmployeeAgreementId == employeeAgreementId);

            if (agreement == null ||
                agreement.AgreementMaster == null)
            {
                return null;
            }

            var agreementFilePath =
                agreement.AgreementMaster.FilePath;

            if (string.IsNullOrWhiteSpace(agreementFilePath))
            {
                return null;
            }

            var relativePath = agreementFilePath
                .TrimStart('/', '\\');

            var originalPath = Path.Combine(
     _environment.WebRootPath,
     relativePath);
            if (!File.Exists(originalPath))
            {
                var agreementFolder = Path.Combine(
                    _environment.WebRootPath,
                    "Agreements");

                var originalFileName = agreement.AgreementMaster.FileName;

                if (!string.IsNullOrWhiteSpace(originalFileName))
                {
                    var fallbackPath = Path.Combine(
                        agreementFolder,
                        originalFileName);

                    if (File.Exists(fallbackPath))
                    {
                        originalPath = fallbackPath;
                    }
                    else
                    {
                        return null;
                    }
                }
                else
                {
                    return null;
                }
            }

            var pdfPath =
                await _agreementTemplateService
                    .ConvertAgreementToPdfAsync(originalPath);

            if (string.IsNullOrWhiteSpace(pdfPath) ||
                !File.Exists(pdfPath))
            {
                return null;
            }

            var pdfBytes =
                await File.ReadAllBytesAsync(pdfPath);

            var pdfFileName =
                $"{Path.GetFileNameWithoutExtension(originalPath)}.pdf";

            return (
                pdfBytes,
                "application/pdf",
                pdfFileName
            );
        }
        public async Task<string?> DownloadSignedAgreement(int employeeAgreementId)

        {

            var agreement = await _context.EmployeeAgreements

                .FirstOrDefaultAsync(x => x.EmployeeAgreementId == employeeAgreementId);

            if (agreement == null || string.IsNullOrWhiteSpace(agreement.SignedPdfPath))

                return null;

            var fullPath = Path.Combine(

                _environment.WebRootPath,

                agreement.SignedPdfPath.TrimStart('/', '\\'));

            if (!File.Exists(fullPath))

                return null;

            return fullPath;

        }

        public async Task<string?> ViewSignedAgreement(int employeeAgreementId)

        {

            return await DownloadSignedAgreement(employeeAgreementId);

        }

        public async Task<object> GetPendingAgreements(string employeeId)

        {

            return await _context.EmployeeAgreements

                .Include(x => x.AgreementMaster)

                .Where(x => x.Employee_Id == employeeId &&

                            x.Status == "Pending")

                .Select(x => new

                {

                    x.EmployeeAgreementId,

                    x.AgreementId,

                    x.AgreementVersion,

                    x.Status,

                    x.CreatedDate,

                    x.AgreementMaster.AgreementName

                })

                .ToListAsync();

        }

        public async Task<object> GetSignedAgreements(string employeeId)

        {

            return await _context.EmployeeAgreements

                .Include(x => x.AgreementMaster)

                .Where(x => x.Employee_Id == employeeId &&

                            x.Status == "Signed")

                .Select(x => new

                {

                    x.EmployeeAgreementId,

                    x.AgreementId,

                    x.AgreementVersion,

                    x.SignedOn,

                    x.SignedLocation,

                    x.SignatureName,

                    x.SignedPdfPath,

                    x.AgreementMaster.AgreementName

                })

                .OrderByDescending(x => x.SignedOn)

                .ToListAsync();

        }

        public async Task<object> GetAgreementReport()

        {

            var data = await (

                from ea in _context.EmployeeAgreements

                join e in _context.Employees

                    on ea.Employee_Id equals e.Employee_Id

                join am in _context.AgreementMasters

                    on ea.AgreementId equals am.AgreementId

                select new

                {

                    e.Employee_Id,

                    EmployeeName = e.Name,

                    am.AgreementName,

                    ea.AgreementVersion,

                    ea.Status,

                    ea.SignedOn

                }

            )

            .OrderBy(x => x.Employee_Id)

            .ToListAsync();

            return data;

        }

        public async Task<FileStreamResult?> DownloadAgreement(

    string employeeId,

    string agreementCode)

        {

            var agreement = await _context.AgreementMasters

                .FirstOrDefaultAsync(x => x.AgreementCode == agreementCode);

            if (agreement == null)

                return null;

            var employeeAgreement = await _context.EmployeeAgreements

                .FirstOrDefaultAsync(x =>

                    x.Employee_Id == employeeId &&

                    x.AgreementId == agreement.AgreementId);

            if (employeeAgreement == null)

                return null;

            if (string.IsNullOrEmpty(employeeAgreement.SignedPdfPath))

                return null;

            var fullPath = Path.Combine(

                _environment.WebRootPath,

                employeeAgreement.SignedPdfPath.TrimStart('/'));

            if (!System.IO.File.Exists(fullPath))

                return null;

            var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read);

            return new FileStreamResult(stream, "application/pdf")

            {

                FileDownloadName = Path.GetFileName(fullPath)

            };

        }

    }

}
