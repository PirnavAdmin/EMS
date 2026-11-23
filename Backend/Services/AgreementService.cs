using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
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
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AgreementService(
            AppDbContext context,
            IWebHostEnvironment environment,
            IAgreementTemplateService agreementTemplateService,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _environment = environment;
            _agreementTemplateService = agreementTemplateService;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
        }

        private async Task<int?> GetCurrentOrgIdAsync()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);
            return orgId;
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

            var currentOrgId = await GetCurrentOrgIdAsync();
            var targetOrgId = currentOrgId ?? dto.OrganizationId;

            var agreementCodeExists = await _context.AgreementMasters
                .AnyAsync(x => x.AgreementCode == dto.AgreementCode && (!targetOrgId.HasValue || x.OrganizationId == targetOrgId.Value));

            if (agreementCodeExists)
            {
                return new
                {
                    Status = false,
                    Message = "Agreement Code already exists in this organization."
                };
            }

            var agreementNameExists = await _context.AgreementMasters
                .AnyAsync(x => x.AgreementName == dto.AgreementName && (!targetOrgId.HasValue || x.OrganizationId == targetOrgId.Value));

            if (agreementNameExists)
            {
                return new
                {
                    Status = false,
                    Message = "Agreement Name already exists in this organization."
                };
            }

            var agreement = new AgreementMaster
            {
                OrganizationId = targetOrgId,
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
                    .Where(x => x.Status == "Active" && (!targetOrgId.HasValue || x.OrganizationId == targetOrgId.Value))
                    .ToListAsync();

                foreach (var employee in employees)
                {
                    var employeeAgreement = new EmployeeAgreement
                    {
                        OrganizationId = targetOrgId,
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
            var orgId = await GetCurrentOrgIdAsync();
            var query = _context.AgreementMasters.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var agreements = await query
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
            var orgId = await GetCurrentOrgIdAsync();

            var query = from ea in _context.EmployeeAgreements
                        join am in _context.AgreementMasters
                            on ea.AgreementId equals am.AgreementId
                        where ea.Employee_Id == employeeId && (!orgId.HasValue || ea.OrganizationId == orgId.Value || am.OrganizationId == orgId.Value)
                        select new EmployeeAgreementDto
                        {
                            EmployeeAgreementId = ea.EmployeeAgreementId,
                            AgreementCode = am.AgreementCode,
                            AgreementName = am.AgreementName,
                            AgreementVersion = ea.AgreementVersion,
                            Status = ea.Status,
                            SignedOn = ea.SignedOn,
                            DownloadUrl = ea.SignedPdfPath
                        };

            return await query.ToListAsync();
        }

        public async Task<string?> GetAgreementFilePath(int agreementId)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var agreement = await _context.AgreementMasters
                .FirstOrDefaultAsync(x => x.AgreementId == agreementId && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (agreement == null)
                return null;

            return agreement.FilePath;
        }

        public async Task<object> SignAgreement(SignAgreementDto dto)
        {
            // Get employee first to determine tenant
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

            // Find agreement using AgreementCode within employee's organization
            var agreement = await _context.AgreementMasters
                .FirstOrDefaultAsync(x => x.AgreementCode == dto.AgreementCode && 
                    (employee.OrganizationId == null || x.OrganizationId == employee.OrganizationId.Value));

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

            if (employeeAgreement.OrganizationId == null && employee.OrganizationId != null)
            {
                employeeAgreement.OrganizationId = employee.OrganizationId;
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
            var orgId = await GetCurrentOrgIdAsync();

            var result = await (from ea in _context.EmployeeAgreements
                                join e in _context.Employees
                                    on ea.Employee_Id equals e.Employee_Id
                                join am in _context.AgreementMasters
                                    on ea.AgreementId equals am.AgreementId
                                where !orgId.HasValue || ea.OrganizationId == orgId.Value || e.OrganizationId == orgId.Value
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
            var orgId = await GetCurrentOrgIdAsync();
            return await _context.AgreementMasters
                .FirstOrDefaultAsync(x => x.AgreementId == agreementId && (!orgId.HasValue || x.OrganizationId == orgId.Value));
        }

        public async Task<(
      byte[] FileBytes,
      string ContentType,
      string FileName)?> ViewAgreement(
          int employeeAgreementId)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var agreement = await _context.EmployeeAgreements
                .Include(x => x.AgreementMaster)
                .FirstOrDefaultAsync(x =>
                    x.EmployeeAgreementId == employeeAgreementId &&
                    (!orgId.HasValue || x.OrganizationId == orgId.Value));

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
            var orgId = await GetCurrentOrgIdAsync();
            var agreement = await _context.EmployeeAgreements
                .FirstOrDefaultAsync(x => x.EmployeeAgreementId == employeeAgreementId && (!orgId.HasValue || x.OrganizationId == orgId.Value));

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
            var orgId = await GetCurrentOrgIdAsync();
            return await _context.EmployeeAgreements
                .Include(x => x.AgreementMaster)
                .Where(x => x.Employee_Id == employeeId &&
                            x.Status == "Pending" &&
                            (!orgId.HasValue || x.OrganizationId == orgId.Value))
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
            var orgId = await GetCurrentOrgIdAsync();
            return await _context.EmployeeAgreements
                .Include(x => x.AgreementMaster)
                .Where(x => x.Employee_Id == employeeId &&
                            x.Status == "Signed" &&
                            (!orgId.HasValue || x.OrganizationId == orgId.Value))
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
            var orgId = await GetCurrentOrgIdAsync();
            var data = await (
                from ea in _context.EmployeeAgreements
                join e in _context.Employees
                    on ea.Employee_Id equals e.Employee_Id
                join am in _context.AgreementMasters
                    on ea.AgreementId equals am.AgreementId
                where !orgId.HasValue || ea.OrganizationId == orgId.Value || e.OrganizationId == orgId.Value
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

        public async Task<(byte[] FileBytes, string ContentType, string FileName)?> GetPrivacyPolicy()
        {
            var agreement = await _context.AgreementMasters
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedDate)
                .FirstOrDefaultAsync();

            if (agreement == null)
            {
                return null;
            }

            var filePath = Path.Combine(
                _environment.WebRootPath,
                agreement.FilePath.TrimStart('/')
                    .Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!File.Exists(filePath))
            {
                return null;
            }

            var pdfPath = await _agreementTemplateService
                .ConvertAgreementToPdfAsync(filePath);

            if (string.IsNullOrWhiteSpace(pdfPath) || !File.Exists(pdfPath))
            {
                return null;
            }

            var pdfBytes = await File.ReadAllBytesAsync(pdfPath);

            var fileName =
                $"{Path.GetFileNameWithoutExtension(agreement.FileName)}.pdf";

            return (
                pdfBytes,
                "application/pdf",
                fileName
            );
        }

        public async Task<(byte[] FileBytes, string ContentType, string FileName)?>
     PreviewPrivacyPolicy()
        {
            var agreementId = _configuration
                .GetValue<int>("AgreementSettings:PrivacyPolicyAgreementId");

            if (agreementId <= 0)
            {
                return null;
            }

            var agreement = await _context.AgreementMasters
                .FirstOrDefaultAsync(x =>
                    x.AgreementId == agreementId &&
                    x.IsActive);

            if (agreement == null)
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(agreement.FilePath))
            {
                return null;
            }

            var relativePath = agreement.FilePath
                .TrimStart('/', '\\');

            var originalPath = Path.Combine(
                _environment.WebRootPath,
                relativePath);

            if (!File.Exists(originalPath))
            {
                return null;
            }

            var pdfPath = await _agreementTemplateService
                .ConvertAgreementToPdfAsync(originalPath);

            if (string.IsNullOrWhiteSpace(pdfPath) ||
                !File.Exists(pdfPath))
            {
                return null;
            }

            var pdfBytes = await File.ReadAllBytesAsync(pdfPath);

            var pdfFileName =
                $"{Path.GetFileNameWithoutExtension(agreement.FileName)}.pdf";

            return (
                pdfBytes,
                "application/pdf",
                pdfFileName
            );
        }
        public async Task<FileStreamResult?> DownloadAgreement(
            string employeeId,
            string agreementCode)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(x => x.Employee_Id == employeeId);
            var agreement = await _context.AgreementMasters
                .FirstOrDefaultAsync(x => x.AgreementCode == agreementCode && (employee == null || employee.OrganizationId == null || x.OrganizationId == employee.OrganizationId.Value));

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
