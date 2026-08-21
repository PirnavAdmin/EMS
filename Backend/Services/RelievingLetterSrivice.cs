using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.IO;
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
        public async Task<object> GenerateRelievingLetterAsync(RelievingLetterRequestDto dto)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            var personalInfo = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.EmployeeId);

            if (personalInfo == null)
                throw new Exception("Employee Personal Info not found.");

            // =====================================
            // Template
            // =====================================

            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "RelivingLetter.docx");

            if (!File.Exists(templatePath))
                throw new Exception("RelievingLetter.docx not found.");

            // =====================================
            // Create Folder
            // wwwroot/RelievingLetters/P259
            // =====================================
            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "GeneratedLetters");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName =
                $"RelievingLetter_{dto.EmployeeId}_{DateTime.Now:yyyyMMddHHmmss}.docx";

            var outputPath = Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            // =====================================
            // Replace Bookmarks
            // =====================================

            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                ReplaceBookmark(wordDoc, "GenerationDate",
    GetOrdinalDate(DateTime.Now));

                ReplaceBookmark(wordDoc, "Title",
                    dto.Title);

                ReplaceBookmark(wordDoc, "EmployeeName",
                    employee.Name);

                ReplaceBookmark(wordDoc, "EmployeeId",
                    employee.Employee_Id);

                ReplaceBookmark(wordDoc, "JoiningDate",
      personalInfo.JoiningDate.HasValue
          ? GetOrdinalDate(personalInfo.JoiningDate.Value)
          : "");

                ReplaceBookmark(wordDoc, "RelievingDate",
     GetOrdinalDate(dto.RelievingDate));

                var designation = string.IsNullOrWhiteSpace(dto.Designation)
    ? (personalInfo.Designation ?? "")
    : dto.Designation;

                ReplaceBookmark(wordDoc, "Designation", designation);
            }

            // =====================================
            // Convert DOCX -> PDF
            // =====================================

            var pdfPath = Path.ChangeExtension(outputPath, ".pdf");

            var process = new Process();

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

            string output = await process.StandardOutput.ReadToEndAsync();
            string error = await process.StandardError.ReadToEndAsync();

            process.WaitForExit();

            if (process.ExitCode != 0)
            {
                throw new Exception(
                    $"LibreOffice failed.\nOutput:{output}\nError:{error}");
            }

            if (!File.Exists(pdfPath))
                throw new Exception("PDF generation failed.");

            // =====================================
            // Delete DOCX
            // =====================================

            if (File.Exists(outputPath))
                File.Delete(outputPath);

            // =====================================
            // Save Relative Paths
            // =====================================
            var relativePdfPath = Path.GetFileName(pdfPath);


            var relievingLetter = new RelievingLetter
            {
                EmployeeId = dto.EmployeeId,
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

            _context.RelievingLetters.Add(relievingLetter);

            await _context.SaveChangesAsync();

            return new
            {
                Message = "Relieving Letter Generated Successfully.",
                relievingLetter.Id,
                relievingLetter.EmployeeId,
                relievingLetter.GeneratedDate
            };
        }


        private string GetGeneratedLetterPath(string pdfPath)
        {
            return Path.Combine(
                Directory.GetCurrentDirectory(),
                pdfPath.Replace("/", Path.DirectorySeparatorChar.ToString()));
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

            var relativePdfPath = Path.GetFileName(pdfPath);


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
                .Join(
                    _context.Employees,
                    rl => rl.EmployeeId,
                    e => e.Employee_Id,
                    (rl, e) => new
                    {
                        rl.Id,
                        rl.EmployeeId,
                        EmployeeName = e.Name,
                        rl.Title,
                        rl.RelievingDate,
                        rl.GeneratedDate,
                        rl.PdfPath
                    })
                .OrderByDescending(x => x.GeneratedDate)
                .ToListAsync();

            return letters;
        }

        public async Task SendRelievingLetterAsync(
    SendRelievingLetterDto dto)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == dto.RelievingLetterId);

            if (letter == null)
                throw new Exception("Relieving Letter not found.");

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == letter.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            var relativePdfPath = Path.GetFileName(pdfPath);


            await _emailService.SendEmailWithAttachment(
                employee.Email,
                dto.Subject,
                dto.Body,
                fullPath);

            letter.Status = "Sent";
            letter.IsSent = true;
            letter.SentOn = DateTime.UtcNow;
            letter.SentCount++;

            await _context.SaveChangesAsync();
        }
        public async Task<RelievingLetterSendStatusDto> GetSendStatusAsync(int id)
        {
            var letter = await _context.RelievingLetters
                .FirstOrDefaultAsync(x => x.Id == id);

            if (letter == null)
                throw new Exception("Relieving Letter not found.");

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == letter.EmployeeId);

            return new RelievingLetterSendStatusDto
            {
                RelievingLetterId = letter.Id,
                EmployeeId = letter.EmployeeId,
                EmployeeName = employee?.Name ?? "",
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

            var relativePdfPath = Path.GetFileName(pdfPath);


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

            var relativePdfPath = Path.GetFileName(pdfPath);

            if (!System.IO.File.Exists(fullPath))
                throw new Exception("PDF not found.");

            return await System.IO.File.ReadAllBytesAsync(fullPath);
        }
    }
}
