
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class AppraisalSalaryService : IAppraisalSalaryService
    {
        private readonly AppDbContext _context;
        private readonly ITemplateService _templateService;
        private readonly IWebHostEnvironment _environment;
        private readonly IEmailService _emailService;

        public AppraisalSalaryService(
         AppDbContext context,
         ITemplateService templateService,
         IWebHostEnvironment environment,
         IEmailService emailService)
        {
            _context = context;
            _templateService = templateService;
            _environment = environment;
            _emailService = emailService;
        }

        // 1. Calculate revised salary from the approved appraisal
        public async Task<AppraisalSalaryDto?> GetRevisedSalaryAsync(
      string employeeId,
      int appraisalId)
        {
            var appraisal = await _context.Appraisals
     .AsNoTracking()
     .FirstOrDefaultAsync(x =>
         x.AppraisalId == appraisalId &&
         x.Employee_Id == employeeId);

            if (appraisal == null)
                return null;

            // If appraisal is already completed,
            // return the saved salary without applying the hike again.
            if (appraisal.Status == "Completed")
            {
                var savedSalary = await _context.EmployeeSalaryStructures
                    .AsNoTracking()
                    .Where(x =>
                        x.Employee_Id == employeeId &&
                        x.IsActive)
                    .OrderByDescending(x => x.EffectiveFrom)
                    .FirstOrDefaultAsync();

                if (savedSalary == null)
                    return null;

                var savedDto = new AppraisalSalaryDto
                {
                    Employee_Id = employeeId,
                    AppraisalId = appraisalId,
                    HikePercentage = appraisal.SalaryHikePercentage,
                    EffectiveFrom = savedSalary.EffectiveFrom,

                    AnnualCTC = savedSalary.AnnualCTC,
                    MonthlyCTC = savedSalary.MonthlyCTC,

                    BasicSalary = savedSalary.BasicSalary,
                    HRA = savedSalary.HRA,
                    ConveyanceAllowance = savedSalary.ConveyanceAllowance,
                    MedicalAllowance = savedSalary.MedicalAllowance,
                    SpecialAllowance = savedSalary.SpecialAllowance,

                    EmployeePF = savedSalary.EmployeePF,
                    EmployerPF = savedSalary.EmployerPF,

                    ProfessionalTax = savedSalary.ProfessionalTax,
                    TDS = savedSalary.TDS,
                    OtherDeduction = savedSalary.OtherDeduction,

                    ESI = 0,
                    VariablePay = 0
                };

                Recalculate(savedDto);

                return savedDto;
            }

            // Continue normal salary calculation only for HR Reviewed.
            if (appraisal.Status != "HR Reviewed")
                return null;
            // Get the current active salary before the hike
            var current = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == employeeId &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (current == null ||
                current.AnnualCTC <= 0 ||
                current.MonthlyCTC <= 0)
            {
                return null;
            }

            // Use the hike percentage stored in the appraisal
            decimal hikePercentage = appraisal.SalaryHikePercentage;

            // Calculate revised CTC using the approved hike
            decimal revisedAnnualCTC = Round(
                current.AnnualCTC *
                (1 + hikePercentage / 100m));

            decimal revisedMonthlyCTC = Round(
                revisedAnnualCTC / 12m);

            // Calculate the proportional increase
            decimal factor =
                revisedMonthlyCTC / current.MonthlyCTC;

            // Create the DTO
            var dto = new AppraisalSalaryDto
            {
                Employee_Id = employeeId,
                AppraisalId = appraisalId,
                HikePercentage = hikePercentage,

                EffectiveFrom = DateTime.Today,

                // Previous Salary
                PreviousAnnualCTC = current.AnnualCTC,
                PreviousMonthlyCTC = current.MonthlyCTC,

                PreviousBasicSalary = current.BasicSalary,
                PreviousHRA = current.HRA,

                PreviousConveyanceAllowance =
                    current.ConveyanceAllowance,

                PreviousMedicalAllowance =
                    current.MedicalAllowance,

                PreviousSpecialAllowance =
                    current.SpecialAllowance,

                PreviousEmployeePF = current.EmployeePF,
                PreviousEmployerPF = current.EmployerPF,

                PreviousProfessionalTax = current.ProfessionalTax,
                PreviousTDS = current.TDS,
                PreviousOtherDeduction = current.OtherDeduction,

                // Revised Salary After Hike
                AnnualCTC = revisedAnnualCTC,
                MonthlyCTC = revisedMonthlyCTC,

                BasicSalary = Round(current.BasicSalary * factor),
                HRA = Round(current.HRA * factor),

                ConveyanceAllowance =
                    Round(current.ConveyanceAllowance * factor),

                MedicalAllowance =
                    Round(current.MedicalAllowance * factor),

                EmployeePF =
                    Round(current.EmployeePF * factor),

                EmployerPF =
                    Round(current.EmployerPF * factor),

                ProfessionalTax = current.ProfessionalTax,
                TDS = current.TDS,
                OtherDeduction = current.OtherDeduction,

                ESI = 0,
                VariablePay = 0
            };

            // Recalculate Special Allowance and Net Take Home
            Recalculate(dto);

            return dto;
        }
        // 2. Save the revised salary after HR confirms it
        public async Task<AppraisalSalaryDto?> SaveRevisedSalaryAsync(
        AppraisalSalaryDto dto)
        {
            var appraisal = await _context.Appraisals
                .FirstOrDefaultAsync(x =>
                    x.AppraisalId == dto.AppraisalId &&
                    x.Employee_Id == dto.Employee_Id &&
                    x.Status == "HR Reviewed");

            if (appraisal == null)
                return null;

            var current = await _context.EmployeeSalaryStructures
                .Where(x =>
                    x.Employee_Id == dto.Employee_Id &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (current == null)
                return null;

            // 1. Get the approved hike percentage
            dto.HikePercentage = appraisal.SalaryHikePercentage;
            // 1. Get the approved hike percentage

            // 2. Keep the revised CTC calculated by GET
            // Do not apply the hike percentage again here.

            if (dto.AnnualCTC <= 0 || dto.MonthlyCTC <= 0)
            {
                throw new InvalidOperationException(
                    "Revised salary must be greater than zero.");
            }

            // 3. Validate fields not supported by the salary table
            if (dto.ESI != 0 || dto.VariablePay != 0)
            {
                throw new InvalidOperationException(
                    "ESI and Variable Pay cannot be saved " +
                    "with the current salary structure.");
            }

            // 4. Recalculate dependent salary components
            // Preserve edited values and recalculate Special Allowance
            Recalculate(dto);

            // 5. Validate effective date
            if (dto.EffectiveFrom == default)
            {
                throw new InvalidOperationException(
                    "Effective date is required.");
            }

            // 6. Deactivate the current salary structure
            current.IsActive = false;
            current.UpdatedAt = DateTime.UtcNow;

            // 7. Create the revised salary structure
            var revised = new EmployeeSalaryStructure
            {
                Employee_Id = dto.Employee_Id,

                AnnualCTC = dto.AnnualCTC,
                MonthlyCTC = dto.MonthlyCTC,

                BasicSalary = dto.BasicSalary,
                HRA = dto.HRA,

                ConveyanceAllowance = dto.ConveyanceAllowance,
                MedicalAllowance = dto.MedicalAllowance,
                SpecialAllowance = dto.SpecialAllowance,

                EmployeePF = dto.EmployeePF,
                EmployerPF = dto.EmployerPF,

                ProfessionalTax = dto.ProfessionalTax,
                TDS = dto.TDS,
                OtherDeduction = dto.OtherDeduction,

                EffectiveFrom = dto.EffectiveFrom,

                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.EmployeeSalaryStructures.Add(revised);

            // 8. Update appraisal status
            appraisal.Status = "Salary Saved";

            // 9. Save changes
            await _context.SaveChangesAsync();

            return dto;
        }
        private static void Recalculate(AppraisalSalaryDto dto)
        {
            if (dto.AnnualCTC <= 0)
                throw new InvalidOperationException(
                    "Annual CTC must be greater than zero.");

            if (dto.BasicSalary < 0 ||
                dto.HRA < 0 ||
                dto.ConveyanceAllowance < 0 ||
                dto.MedicalAllowance < 0 ||
                dto.EmployeePF < 0 ||
                dto.EmployerPF < 0 ||
                dto.ProfessionalTax < 0 ||
                dto.TDS < 0 ||
                dto.OtherDeduction < 0)
            {
                throw new InvalidOperationException(
                    "Salary components cannot be negative.");
            }

            // Employer PF is included in CTC.
            // Special Allowance balances the CTC.
            dto.SpecialAllowance = Round(
                dto.MonthlyCTC
                - dto.EmployerPF
                - dto.BasicSalary
                - dto.HRA
                - dto.ConveyanceAllowance
                - dto.MedicalAllowance);

            if (dto.SpecialAllowance < 0)
                throw new InvalidOperationException(
                    "Salary components exceed the revised CTC.");

            dto.GrossSalary =
                dto.BasicSalary
                + dto.HRA
                + dto.ConveyanceAllowance
                + dto.MedicalAllowance
                + dto.SpecialAllowance;

            dto.NetTakeHome =
                dto.GrossSalary
                - dto.EmployeePF
                - dto.ProfessionalTax
                - dto.TDS
                - dto.OtherDeduction;
        }

        private static decimal Round(decimal value)
        {
            return Math.Round(
                value,
                2,
                MidpointRounding.AwayFromZero);
        }

        // PDF generation will be implemented next.
        public async Task<string> GenerateAppraisalLetterAsync(
     int appraisalId)
        {
            var appraisal = await _context.Appraisals
    .FirstOrDefaultAsync(x =>
        x.AppraisalId == appraisalId &&
        (x.Status == "Salary Saved" ||
         x.Status == "Letter Generated"));

            if (appraisal == null)
                throw new InvalidOperationException(
                    "Completed appraisal not found.");

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == appraisal.Employee_Id);

            if (employee == null)
                throw new InvalidOperationException(
                    "Employee not found.");

            var salary = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == appraisal.Employee_Id &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (salary == null)
                throw new InvalidOperationException(
                    "Active salary structure not found.");
            // Get active APPRAISAL template
            var template = await _templateService
                .GetActiveTemplateAsync("APPRAISAL");

            if (template == null)
                throw new InvalidOperationException(
                    "Active appraisal template not found.");

            if (string.IsNullOrWhiteSpace(template.FilePath))
                throw new InvalidOperationException(
                    "Appraisal template file path is missing.");

            var relativeTemplatePath =
                template.FilePath.TrimStart('/', '\\');

            var templatePath = Path.Combine(
                _environment.WebRootPath,
                relativeTemplatePath);

            if (!File.Exists(templatePath))
                throw new FileNotFoundException(
                    "Appraisal template file not found.",
                    templatePath);

            // Temporary DOCX file
            var tempDirectory = Path.Combine(
                _environment.ContentRootPath,
                "Temp",
                "Appraisal");
            var appraisalDirectory = Path.Combine(
    _environment.ContentRootPath,
    "GeneratedFiles",
    "AppraisalLetters");

            Directory.CreateDirectory(appraisalDirectory);

            Directory.CreateDirectory(tempDirectory);

            var fileName =
     $"Appraisal_{employee.Employee_Id}_{appraisalId}";

            var docxPath = Path.Combine(
                tempDirectory,
                $"{fileName}.docx");

            var pdfPath = Path.Combine(
        appraisalDirectory,
        $"{fileName}.pdf");

            // Copy template
            File.Copy(
                templatePath,
                docxPath,
                true);

            // Replace bookmarks
            using (var document =
                DocumentFormat.OpenXml.Packaging.WordprocessingDocument
                    .Open(docxPath, true))
            {
                ReplaceBookmark(
                    document,
                    "LetterDate",
                    DateTime.Now.ToString("dd MMMM yyyy"));

                ReplaceBookmark(
                    document,
                    "EmployeeName",
                    employee.Name);

                ReplaceBookmark(
                    document,
                    "EmployeeId",
                    employee.Employee_Id);

                ReplaceBookmark(
                    document,
                    "RevisedCTC",
                    salary.AnnualCTC.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "EffectiveDate",
                    salary.EffectiveFrom.ToString("dd/MM/yyyy"));

                ReplaceBookmark(
                    document,
                    "Designation",
                    employee.RoleName);

                // Basic
                ReplaceBookmark(
                    document,
                    "BasicMonthly",
                    salary.BasicSalary.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "BasicYearly",
                    (salary.BasicSalary * 12).ToString("N2"));

                // HRA
                ReplaceBookmark(
                    document,
                    "HraMonthly",
                    salary.HRA.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "HraYearly",
                    (salary.HRA * 12).ToString("N2"));

                // Conveyance
                ReplaceBookmark(
                    document,
                    "ConveyanceMonthly",
                    salary.ConveyanceAllowance.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "ConveyanceYearly",
                    (salary.ConveyanceAllowance * 12).ToString("N2"));

                // Medical
                ReplaceBookmark(
                    document,
                    "MedicalAllowanceMonthly",
                    salary.MedicalAllowance.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "MedicalAllowanceYearly",
                    (salary.MedicalAllowance * 12).ToString("N2"));

                // Other Allowances
                ReplaceBookmark(
                    document,
                    "OtherAllowancesMonthly",
                    salary.SpecialAllowance.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "OtherAllowancesYearly",
                    (salary.SpecialAllowance * 12).ToString("N2"));

                // Gross
                decimal gross =
                    salary.BasicSalary +
                    salary.HRA +
                    salary.ConveyanceAllowance +
                    salary.MedicalAllowance +
                    salary.SpecialAllowance;

                ReplaceBookmark(
                    document,
                    "GrossMonthly",
                    gross.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "GrossYearly",
                    (gross * 12).ToString("N2"));

                // B Gross
                ReplaceBookmark(
                    document,
                    "GrossBMonthly",
                    gross.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "GrossBYearly",
                    (gross * 12).ToString("N2"));

                // Professional Tax
                ReplaceBookmark(
                    document,
                    "ProfessionalTaxMonthly",
                    salary.ProfessionalTax.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "ProfessionalTaxYearly",
                    (salary.ProfessionalTax * 12).ToString("N2"));

                // Employee PF
                ReplaceBookmark(
                    document,
                    "PFMonthly",
                    salary.EmployeePF.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "PFYearly",
                    (salary.EmployeePF * 12).ToString("N2"));

                // ESI
                ReplaceBookmark(
                    document,
                    "ESIMonthly",
                    "0.00");

                ReplaceBookmark(
                    document,
                    "ESIYearly",
                    "0.00");

                // Net Take Home
                decimal netTakeHome =
                    gross -
                    salary.EmployeePF -
                    salary.ProfessionalTax -
                    salary.TDS -
                    salary.OtherDeduction;

                ReplaceBookmark(
                    document,
                    "NetTakeHomeMonthly",
                    netTakeHome.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "NetTakeHomeYearly",
                    (netTakeHome * 12).ToString("N2"));

                // Employer PF
                ReplaceBookmark(
                    document,
                    "PFContributionMonthly",
                    salary.EmployerPF.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "PFContributionYearly",
                    (salary.EmployerPF * 12).ToString("N2"));

                // Variable Pay
                ReplaceBookmark(
                    document,
                    "VariablePayMonthly",
                    "0.00");

                ReplaceBookmark(
                    document,
                    "VariablePayYearly",
                    "0.00");

                // CTC
                ReplaceBookmark(
                    document,
                    "CTCMonthly",
                    salary.MonthlyCTC.ToString("N2"));

                ReplaceBookmark(
                    document,
                    "CTCYearly",
                    salary.AnnualCTC.ToString("N2"));
            }

            // Convert DOCX to PDF using LibreOffice
            var libreOfficePath =
    @"C:\Program Files\LibreOffice\program\soffice.exe";

            var processInfo =
                new System.Diagnostics.ProcessStartInfo
                {
                    FileName = libreOfficePath,
                    Arguments =
                        $"--headless --convert-to pdf " +
$"--outdir \"{appraisalDirectory}\" " +
                        $"\"{docxPath}\"",

                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

            using var process =
                new System.Diagnostics.Process();

            process.StartInfo = processInfo;

            process.Start();

            var output =
                await process.StandardOutput.ReadToEndAsync();

            var error =
                await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0 ||
                !File.Exists(pdfPath))
            {
                throw new InvalidOperationException(
                    $"Failed to generate appraisal PDF. " +
                    $"Output: {output}. Error: {error}");
            }

            //var pdfBytes =
            //    await File.ReadAllBytesAsync(pdfPath);

            // Cleanup temporary files
            try
            {
                if (File.Exists(docxPath))
                    File.Delete(docxPath);

                //if (File.Exists(pdfPath))
                //    File.Delete(pdfPath);
            }
            catch
            {
                // Ignore cleanup errors
            }

            var appraisalToUpdate = await _context.Appraisals
     .FirstOrDefaultAsync(x => x.AppraisalId == appraisalId);

            if (appraisalToUpdate != null)
            {
                appraisalToUpdate.Status = "Letter Generated";
                await _context.SaveChangesAsync();
            }

            return pdfPath;
        }

        public async Task<string> GetAppraisalLetterPathAsync(int appraisalId)
        {
            var appraisal = await _context.Appraisals
                .FirstOrDefaultAsync(x => x.AppraisalId == appraisalId);

            if (appraisal == null)
            {
                throw new InvalidOperationException(
                    "Appraisal not found.");
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == appraisal.Employee_Id);

            if (employee == null)
            {
                throw new InvalidOperationException(
                    "Employee not found.");
            }

            var appraisalDirectory = Path.Combine(
                _environment.ContentRootPath,
                "GeneratedFiles",
                "AppraisalLetters");

            var fileName =
                $"Appraisal_{employee.Employee_Id}_{appraisalId}.pdf";

            var pdfPath = Path.Combine(
                appraisalDirectory,
                fileName);

            if (!File.Exists(pdfPath))
            {
                throw new FileNotFoundException(
                    "Generated appraisal letter was not found.",
                    pdfPath);
            }

            return pdfPath;
        }
        private void ReplaceBookmark(
    DocumentFormat.OpenXml.Packaging.WordprocessingDocument document,
    string bookmarkName,
    string text)
        {
            var bookmark = document.MainDocumentPart?
                .RootElement?
                .Descendants<
                    DocumentFormat.OpenXml.Wordprocessing.BookmarkStart>()
                .FirstOrDefault(b =>
                    b.Name == bookmarkName);

            if (bookmark == null)
                return;

            DocumentFormat.OpenXml.Wordprocessing.RunProperties?
                runProperties = null;

            var current = bookmark.NextSibling();

            while (current != null &&
                   current is not
                       DocumentFormat.OpenXml.Wordprocessing.BookmarkEnd)
            {
                var next = current.NextSibling();

                if (current is
                        DocumentFormat.OpenXml.Wordprocessing.Run existingRun &&
                    existingRun.RunProperties != null &&
                    runProperties == null)
                {
                    runProperties =
                        existingRun.RunProperties.CloneNode(true)
                        as DocumentFormat.OpenXml.Wordprocessing.RunProperties;
                }

                current.Remove();
                current = next;
            }

            var newRun =
                new DocumentFormat.OpenXml.Wordprocessing.Run();

            if (runProperties != null)
            {
                newRun.Append(
                    runProperties.CloneNode(true));
            }

            newRun.Append(
                new DocumentFormat.OpenXml.Wordprocessing.Text(
                    text ?? string.Empty)
                {
                    Space =
                        DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve
                });

            bookmark.Parent?
                .InsertAfter(newRun, bookmark);
        }

        public async Task SendAppraisalLetterEmailAsync(
      int appraisalId)
        {
            var appraisal = await _context.Appraisals
    .FirstOrDefaultAsync(x =>
        x.AppraisalId == appraisalId &&
        x.Status == "Letter Generated");
            if (appraisal == null)
            {
                throw new InvalidOperationException(
                    "Completed appraisal not found.");
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == appraisal.Employee_Id);

            if (employee == null)
            {
                throw new InvalidOperationException(
                    "Employee not found.");
            }

            if (string.IsNullOrWhiteSpace(employee.Email))
            {
                throw new InvalidOperationException(
                    "Employee email address not found.");
            }

            var salary = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == appraisal.Employee_Id &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (salary == null)
            {
                throw new InvalidOperationException(
                    "Active salary structure not found.");
            }

            // Use the already generated appraisal PDF
            var pdfPath =
                await GetAppraisalLetterPathAsync(appraisalId);

            await _emailService.SendEmailWithAttachment(
                employee.Email,
                "Performance Appraisal Letter",
                $"""
    Dear {employee.Name},

    Greetings from the HR Team!

    We are pleased to share your Performance Appraisal Letter following the completion of your performance appraisal for the current review cycle.

    Based on the appraisal outcome, your revised salary structure has been updated and is effective from
    {salary.EffectiveFrom:dd/MM/yyyy}.

    Please find your Performance Appraisal Letter attached to this email for your reference. The letter contains the details of your revised compensation structure.

    We appreciate your contributions and efforts, and we look forward to your continued growth and success with the organization.

    If you have any questions regarding the appraisal or revised compensation details, please feel free to contact the HR Team.

    Regards,
    HR Team
    """,
                pdfPath);

            appraisal.Status = "Completed";

            await _context.SaveChangesAsync();



        }
    }
}