using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace EmployeeManagementSystem.Services
{
    public class RelievingLetterService : IRelievingLetterService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IEmailService _emailService;
        private readonly ITemplateService _templateService;

        public RelievingLetterService(
 AppDbContext context,
 IWebHostEnvironment environment,
 IEmailService emailService,
 ITemplateService templateService)
        {
            _context = context;
            _environment = environment;
            _emailService = emailService;
            _templateService = templateService;
        }
        private static string GetOrdinalDate(DateTime date)
        {
            int day = date.Day;

            string suffix;

            if (day % 100 >= 11 && day % 100 <= 13)
            {
                suffix = "th";
            }
            else
            {
                switch (day % 10)
                {
                    case 1:
                        suffix = "st";
                        break;
                    case 2:
                        suffix = "nd";
                        break;
                    case 3:
                        suffix = "rd";
                        break;
                    default:
                        suffix = "th";
                        break;
                }
            }

            return $"{day}{suffix} {date:MMM yyyy}";
        }
        public async Task<object> GenerateRelievingLetterAsync(
      RelievingLetterRequestDto dto)
        {
            // =====================================================
            // VALIDATE BASIC INPUT
            // =====================================================

            if (string.IsNullOrWhiteSpace(dto.EmployeeId))
                throw new Exception("Employee ID is required.");

            if (string.IsNullOrWhiteSpace(dto.EmployeeName))
            {
                // If employee exists, name can come from Employees.
                // So don't reject it here.
            }

            // =====================================================
            // CHECK WHETHER EMPLOYEE EXISTS
            // =====================================================

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == dto.EmployeeId);

            // =====================================================
            // CHECK PERSONAL INFO ONLY IF EMPLOYEE EXISTS
            // =====================================================

            var personalInfo = employee == null
                ? null
                : await _context.EmployeePersonalInfos
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == dto.EmployeeId);

            // =====================================================
            // RESOLVE DETAILS
            // EXISTING EMPLOYEE → DATABASE
            // NON-EMPLOYEE → DTO
            // =====================================================

            var employeeName =
                !string.IsNullOrWhiteSpace(employee?.Name)
                    ? employee.Name
                    : dto.EmployeeName;

            var employeeId =
                !string.IsNullOrWhiteSpace(employee?.Employee_Id)
                    ? employee.Employee_Id
                    : dto.EmployeeId;

            var email =
                !string.IsNullOrWhiteSpace(employee?.Email)
                    ? employee.Email
                    : dto.Email;

            var joiningDate =
                personalInfo?.JoiningDate
                ?? dto.JoiningDate;

            var designation =
                !string.IsNullOrWhiteSpace(dto.Designation)
                    ? dto.Designation
                    : personalInfo?.Designation
                      ?? employee?.RoleName
                      ?? string.Empty;

            // =====================================================
            // VALIDATION
            // =====================================================

            if (string.IsNullOrWhiteSpace(employeeName))
                throw new Exception("Employee name is required.");

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Email is required.");

            if (dto.RelievingDate == default)
                throw new Exception("Relieving date is required.");

            // =====================================================
            // TEMPLATE
            // =====================================================

            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "RelivingLetter.docx");

            if (!File.Exists(templatePath))
                throw new Exception(
                    "RelievingLetter.docx not found.");

            // =====================================================
            // OUTPUT FOLDER
            // =====================================================

            var outputFolder = Path.Combine(
                _environment.WebRootPath,
                "RelievingLetters",
                employeeId);

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            // =====================================================
            // FILE NAME
            // =====================================================

            var fileName =
                $"RelievingLetter_{employeeId}_{DateTime.Now:yyyyMMddHHmmss}.docx";

            var outputPath = Path.Combine(
                outputFolder,
                fileName);

            File.Copy(
                templatePath,
                outputPath,
                true);

            // =====================================================
            // REPLACE WORD BOOKMARKS
            // =====================================================

            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                ReplaceBookmark(
                    wordDoc,
                    "GenerationDate",
                    GetOrdinalDate(DateTime.Now));

                ReplaceBookmark(
                    wordDoc,
                    "Title",
                    dto.Title);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeName",
                    employeeName);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeId",
                    employeeId);

                ReplaceBookmark(
                    wordDoc,
                    "JoiningDate",
                    joiningDate.HasValue
                        ? GetOrdinalDate(joiningDate.Value)
                        : "");

                ReplaceBookmark(
                    wordDoc,
                    "RelievingDate",
                    GetOrdinalDate(dto.RelievingDate));

                ReplaceBookmark(
                    wordDoc,
                    "Designation",
                    designation);
            }

            // =====================================================
            // CONVERT DOCX TO PDF
            // =====================================================

            var pdfPath =
                Path.ChangeExtension(
                    outputPath,
                    ".pdf");

            using var process = new Process();

            var sofficePath =
                RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                    : "/usr/bin/soffice";

            process.StartInfo.FileName = sofficePath;

            process.StartInfo.Arguments =
                $"--headless --nologo --nofirststartwizard " +
                $"--convert-to pdf " +
                $"\"{outputPath}\" " +
                $"--outdir \"{outputFolder}\"";

            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.CreateNoWindow = true;

            process.Start();

            var output =
                await process.StandardOutput.ReadToEndAsync();

            var error =
                await process.StandardError.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                throw new Exception(
                    $"LibreOffice failed. " +
                    $"Output: {output} " +
                    $"Error: {error}");
            }

            if (!File.Exists(pdfPath))
                throw new Exception(
                    "PDF generation failed.");

            // =====================================================
            // DELETE DOCX AFTER PDF GENERATION
            // =====================================================

            if (File.Exists(outputPath))
                File.Delete(outputPath);

            // =====================================================
            // RELATIVE PDF PATH
            // =====================================================

            var relativePdfPath =
                Path.Combine(
                    "RelievingLetters",
                    employeeId,
                    Path.GetFileName(pdfPath))
                .Replace("\\", "/");

            // =====================================================
            // SAVE DATABASE RECORD
            // =====================================================

            var relievingLetter = new RelievingLetter
            {
                EmployeeId = employeeId,

                EmployeeName = employeeName,

                Email = email,

                Designation = designation,

                JoiningDate = joiningDate,

                Title = dto.Title,

                RelievingDate = dto.RelievingDate,

                GeneratedDate = DateTime.Now,

                DocxPath = null,

                PdfPath = relativePdfPath,

                Status = "Draft",

                SentOn = null,

                IsSent = false,

                SentCount = 0
            };

            _context.RelievingLetters.Add(
                relievingLetter);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                var dbError = ex.InnerException?.InnerException?.Message
                              ?? ex.InnerException?.Message
                              ?? ex.Message;

                throw new Exception($"Database save failed: {dbError}");
            }

            return new
            {
                Message =
                    "Relieving Letter Generated Successfully.",

                RelievingLetterId =
                    relievingLetter.Id,

                EmployeeId =
                    relievingLetter.EmployeeId,

                EmployeeName =
                    relievingLetter.EmployeeName,

                Email =
                    relievingLetter.Email,

                PdfPath =
                    relievingLetter.PdfPath,

                IsExistingEmployee =
                    employee != null
            };
        }
        private static string GetOrdinal(int day)
        {
            if (day >= 11 && day <= 13)
                return day + "th";

            return (day % 10) switch
            {
                1 => day + "st",
                2 => day + "nd",
                3 => day + "rd",
                _ => day + "th"
            };
        }

        private void ReplaceBookmark(
    WordprocessingDocument doc,
    string bookmarkName,
    string text)
        {
            var bookmark = doc.MainDocumentPart?
                .RootElement?
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == bookmarkName);

            if (bookmark == null)
                return;

            OpenXmlElement current = bookmark.NextSibling();

            while (current != null && current is not BookmarkEnd)
            {
                var next = current.NextSibling();

                current.Remove();

                current = next;
            }

            var run = new Run(
                new Text(text ?? string.Empty)
                {
                    Space = SpaceProcessingModeValues.Preserve
                });

            bookmark.Parent?.InsertAfter(run, bookmark);
        }
       

        public async Task<RelievingLetterDownloadDto?> DownloadRelievingLetterAsync(int id)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (letter == null)
                throw new Exception("Relieving Letter record not found.");

            if (string.IsNullOrWhiteSpace(letter.PdfPath))
                throw new Exception("PDF path is empty.");

            var fullPath = Path.Combine(
                _environment.WebRootPath,
                letter.PdfPath.Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!System.IO.File.Exists(fullPath))
                throw new Exception($"PDF file not found.\n{fullPath}");

            return new RelievingLetterDownloadDto
            {
                FileBytes = await System.IO.File.ReadAllBytesAsync(fullPath),
                FileName = Path.GetFileName(fullPath)
            };
        }

        public async Task<object> GetAllRelievingLettersAsync()
        {
            var letters = await _context.RelievingLetters
                .OrderByDescending(x => x.GeneratedDate)
                .Select(x => new
                {
                    x.Id,
                    x.EmployeeId,

                    EmployeeName =
                        x.EmployeeName
                        ?? _context.Employees
                            .Where(e =>
                                e.Employee_Id == x.EmployeeId)
                            .Select(e => e.Name)
                            .FirstOrDefault()
                        ?? x.EmployeeId,

                    x.Email,
                    x.Designation,
                    x.Title,
                    x.RelievingDate,
                    x.GeneratedDate,
                    x.PdfPath,
                    x.Status,
                    x.SentOn,
                    x.IsSent,
                    x.SentCount
                })
                .ToListAsync();

            return letters;
        }

        public async Task SendRelievingLetterAsync(
      SendRelievingLetterDto dto)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(
                    x => x.Id == dto.RelievingLetterId);

            if (letter == null)
                throw new Exception(
                    "Relieving Letter not found.");

            if (string.IsNullOrWhiteSpace(letter.Email))
                throw new Exception(
                    "Email address not available.");

            if (string.IsNullOrWhiteSpace(letter.PdfPath))
                throw new Exception(
                    "PDF path not available.");

            var fullPath = Path.Combine(
                _environment.WebRootPath,
                letter.PdfPath
                    .Replace(
                        "/",
                        Path.DirectorySeparatorChar.ToString()));

            if (!File.Exists(fullPath))
                throw new Exception(
                    "Relieving Letter PDF not found.");

            await _emailService.SendEmailWithAttachment(
                letter.Email,
                dto.Subject,
                dto.Body,
                fullPath);

            letter.Status = "Sent";
            letter.IsSent = true;
            letter.SentOn = DateTime.UtcNow;
            letter.SentCount++;

            await _context.SaveChangesAsync();
        }
        public async Task<RelievingLetterSendStatusDto>
         GetSendStatusAsync(int id)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (letter == null)
                throw new Exception(
                    "Relieving Letter not found.");

            return new RelievingLetterSendStatusDto
            {
                RelievingLetterId = letter.Id,

                EmployeeId = letter.EmployeeId,

                EmployeeName =
                    letter.EmployeeName
                    ?? letter.EmployeeId,

                IsSent = letter.IsSent,

                SentCount = letter.SentCount,

                Status = letter.Status,

                SentOn = letter.SentOn
            };
        }
        public async Task DeleteRelievingLetterAsync(int id)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (letter == null)
                throw new Exception("Relieving Letter not found.");

            if (letter.Status == "Sent")
                throw new Exception("Sent Relieving Letter cannot be deleted.");

            var fullPath = Path.Combine(
                _environment.WebRootPath,
                letter.PdfPath.Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            _context.RelievingLetters.Remove(letter);

            await _context.SaveChangesAsync();
        }

        public async Task<byte[]> PreviewRelievingLetterAsync(int id)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (letter == null)
                throw new Exception("Relieving Letter not found.");

            var fullPath = Path.Combine(
                _environment.WebRootPath,
                letter.PdfPath.Replace("/", Path.DirectorySeparatorChar.ToString()));

            if (!System.IO.File.Exists(fullPath))
                throw new Exception("PDF not found.");

            return await System.IO.File.ReadAllBytesAsync(fullPath);
        }
    }
}
