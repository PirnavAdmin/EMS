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
    public class ExperienceLetterService : IExperienceLetterService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IEmailService _emailService;

        public ExperienceLetterService(
            AppDbContext context,
            IWebHostEnvironment environment,
            IEmailService emailService)
        {
            _context = context;
            _environment = environment;
            _emailService = emailService;
        }


        // =========================================
        // GENERATE EXPERIENCE LETTER
        // =========================================

        public async Task<object> GenerateExperienceLetterAsync(
     ExperienceLetterRequestDto dto)
        {
            // =====================================
            // VALIDATION
            // =====================================

            // FIRST CHECK DTO
            if (dto == null)
            {
                throw new ArgumentNullException(
                    nameof(dto),
                    "Request body is required.");
            }

            // THEN CHECK EMPLOYEE ID
            if (string.IsNullOrWhiteSpace(dto.EmployeeId))
            {
                throw new Exception(
                    "Employee ID is required.");
            }

            // CHECK END DATE
            if (dto.EndDate == default)
            {
                throw new Exception(
                    "End Date is required.");
            }

         
        


        // =====================================
        // EMPLOYEE
        // =====================================

        var employee = await _context.Employees
                .FirstOrDefaultAsync(
                    x => x.Employee_Id == dto.EmployeeId);

            if (employee == null)
            {
                throw new Exception(
                    "Employee not found.");
            }


            // =====================================
            // PERSONAL INFO
            // =====================================

            var personalInfo =
                await _context.EmployeePersonalInfos
                    .FirstOrDefaultAsync(
                        x => x.Employee_Id ==
                             dto.EmployeeId);

            if (personalInfo == null)
            {
                throw new Exception(
                    "Employee Personal Info not found.");
            }

            if (!personalInfo.JoiningDate.HasValue)
            {
                throw new Exception(
                    "Employee Joining Date not found.");
            }


            // =====================================
            // START / END DATE
            // =====================================

            DateTime startDate =
                personalInfo.JoiningDate.Value;

            DateTime endDate =
                dto.EndDate;

            if (endDate < startDate)
            {
                throw new Exception(
                    "End Date cannot be before Joining Date.");
            }


            // =====================================
            // EMPLOYEE FULL NAME
            // =====================================

            string employeeName =
     employee.Name;

            string employeeFullName =
                $"{dto.Title} {employee.Name}".Trim();


            // =====================================
            // DESIGNATION
            // =====================================

            string designation =
                !string.IsNullOrWhiteSpace(
                    dto.Designation)
                    ? dto.Designation
                    : personalInfo.Designation ?? "-";


            // =====================================
            // DEPARTMENT
            // =====================================

            string department =
                !string.IsNullOrWhiteSpace(
                    dto.Department)
                    ? dto.Department
                    : "-";


            // =====================================
            // EMPLOYMENT TENURE
            // =====================================

            string employmentTenure =
                CalculateEmploymentTenure(
                    startDate,
                    endDate);


            // =====================================
            // FORMATTED DATES
            // =====================================

            string generationDate =
                DateTime.Now.ToString(
                    "dd MMMM yyyy");

            string formattedStartDate =
                startDate.ToString(
                    "dd/MM/yyyy");

            string formattedEndDate =
                endDate.ToString(
                    "dd/MM/yyyy");


            // =====================================
            // REFERENCE NUMBER
            // =====================================

            string serialNo =
                DateTime.Now.ToString(
                    "yyyyMMddHHmmss");


            // =====================================
            // SIGNATORY
            // =====================================

            string authorizedSignatory =
                string.IsNullOrWhiteSpace(
                    dto.AuthorizedSignatory)
                    ? "-"
                    : dto.AuthorizedSignatory;

            string authorizedSignatoryDesignation =
                string.IsNullOrWhiteSpace(
                    dto.AuthorizedSignatoryDesignation)
                    ? "Head of Human Resources"
                    : dto.AuthorizedSignatoryDesignation;


            // =====================================
            // TEMPLATE
            // =====================================

            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "Experience_Letter_All_Bookmarks.docx");

            if (!File.Exists(templatePath))
            {
                throw new Exception(
                    $"Experience Letter template not found: " +
                    $"{templatePath}");
            }


            // =====================================
            // OUTPUT FOLDER
            // =====================================

            var outputFolder = Path.Combine(
                _environment.WebRootPath,
                "ExperienceLetters",
                dto.EmployeeId);

            if (!Directory.Exists(outputFolder))
            {
                Directory.CreateDirectory(
                    outputFolder);
            }


            // =====================================
            // CREATE DOCX
            // =====================================

            var fileName =
                $"ExperienceLetter_{dto.EmployeeId}_" +
                $"{DateTime.Now:yyyyMMddHHmmss}.docx";

            var outputPath =
                Path.Combine(
                    outputFolder,
                    fileName);

            File.Copy(
                templatePath,
                outputPath,
                true);


            // =====================================
            // REPLACE ALL 18 BOOKMARKS
            // =====================================

            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(
                    outputPath,
                    true))
            {
                // -------------------------------
                // DATE
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "GenerationDate",
                    generationDate);


                // -------------------------------
                // SERIAL NUMBER
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "SerialNo",
                    serialNo);


                // -------------------------------
                // EMPLOYEE NAME
                // Appears 3 times
                // -------------------------------

                ReplaceBookmark(
     wordDoc,
     "EmployeeName",
     employeeName);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeName2",
                    employeeName);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeName3",
                    employeeName);


                // -------------------------------
                // EMPLOYEE ID
                // Appears 2 times
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeId",
                    employee.Employee_Id);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeId2",
                    employee.Employee_Id);


                // -------------------------------
                // EMPLOYMENT TENURE
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "EmploymentTenure",
                    employmentTenure);


                // -------------------------------
                // START DATE
                // Appears 2 times
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "StartDate",
                    formattedStartDate);

                ReplaceBookmark(
                    wordDoc,
                    "StartDate2",
                    formattedStartDate);


                // -------------------------------
                // END DATE
                // Appears 2 times
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "EndDate",
                    formattedEndDate);

                ReplaceBookmark(
                    wordDoc,
                    "EndDate2",
                    formattedEndDate);


                // -------------------------------
                // DESIGNATION
                // Appears 2 times
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "Designation",
                    designation);

                ReplaceBookmark(
                    wordDoc,
                    "Designation2",
                    designation);


                // -------------------------------
                // DEPARTMENT
                // Appears 2 times
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "Department",
                    department);

                ReplaceBookmark(
                    wordDoc,
                    "Department2",
                    department);


                // -------------------------------
                // AUTHORIZED SIGNATORY
                // -------------------------------

                ReplaceBookmark(
                    wordDoc,
                    "AuthorizedSignatory",
                    authorizedSignatory);

                ReplaceBookmark(
                    wordDoc,
                    "AuthorizedSignatoryDesignation",
                    authorizedSignatoryDesignation);
            }


            // =====================================
            // CONVERT DOCX -> PDF
            // =====================================

            var pdfPath =
                Path.ChangeExtension(
                    outputPath,
                    ".pdf");

            var process =
                new Process();

            var sofficePath =
                RuntimeInformation.IsOSPlatform(
                    OSPlatform.Windows)
                    ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                    : "/usr/bin/soffice";

            process.StartInfo.FileName =
                sofficePath;

            process.StartInfo.Arguments =
                $"--headless " +
                $"--nologo " +
                $"--nofirststartwizard " +
                $"--convert-to pdf " +
                $"\"{outputPath}\" " +
                $"--outdir \"{outputFolder}\"";

            process.StartInfo.RedirectStandardOutput =
                true;

            process.StartInfo.RedirectStandardError =
                true;

            process.StartInfo.UseShellExecute =
                false;

            process.StartInfo.CreateNoWindow =
                true;

            process.Start();

            string output =
                await process.StandardOutput
                    .ReadToEndAsync();

            string error =
                await process.StandardError
                    .ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                throw new Exception(
                    $"LibreOffice failed." +
                    $"\nOutput: {output}" +
                    $"\nError: {error}");
            }

            if (!File.Exists(pdfPath))
            {
                throw new Exception(
                    "Experience Letter PDF generation failed.");
            }


            // =====================================
            // DELETE TEMP DOCX
            // =====================================

            if (File.Exists(outputPath))
            {
                File.Delete(outputPath);
            }


            // =====================================
            // RELATIVE PDF PATH
            // =====================================

            var relativePdfPath =
                Path.Combine(
                    "ExperienceLetters",
                    dto.EmployeeId,
                    Path.GetFileName(pdfPath))
                .Replace("\\", "/");


            // =====================================
            // DATABASE
            // =====================================

            // =====================================
            // SAVE EXPERIENCE LETTER TO DATABASE
            // =====================================

            var experienceLetter =
                new ExperienceLetter
                {
                    EmployeeId =
                        dto.EmployeeId,

                    Title =
                        dto.Title,

                    Designation =
                        designation,

                    Department =
                        department,

                    StartDate =
                        startDate,

                    EndDate =
                        endDate,

                    EmploymentTenure =
                        employmentTenure,

                    SerialNo =
                        serialNo,

                    AuthorizedSignatory =
                        authorizedSignatory,

                    AuthorizedSignatoryDesignation =
                        authorizedSignatoryDesignation,

                    GeneratedDate =
                        DateTime.Now,

                    PdfPath =
                        relativePdfPath,

                    Status =
                        "Draft",

                    IsSent =
                        false,

                    SentOn =
                        null,

                    SentCount =
                        0
                };

            _context.ExperienceLetters.Add(
                experienceLetter);

            await _context.SaveChangesAsync(); // =====================================
                                               // RESPONSE
                                               // =====================================

            return new
            {
                Message =
            "Experience Letter Generated Successfully.",

                ExperienceLetterId =
            experienceLetter.Id,

                EmployeeId =
            experienceLetter.EmployeeId,

                EmployeeName =
            employeeFullName,

                Title =
            experienceLetter.Title,

                Designation =
            experienceLetter.Designation,

                Department =
            experienceLetter.Department,

                StartDate =
            experienceLetter.StartDate,

                EndDate =
            experienceLetter.EndDate,

                EmploymentTenure =
            experienceLetter.EmploymentTenure,

                SerialNo =
            experienceLetter.SerialNo,

                AuthorizedSignatory =
            experienceLetter.AuthorizedSignatory,

                AuthorizedSignatoryDesignation =
            experienceLetter.AuthorizedSignatoryDesignation,

                GeneratedDate =
            experienceLetter.GeneratedDate,

                Status =
            experienceLetter.Status
            };
        }

        public async Task SendExperienceLetterAsync(
    SendExperienceLetterDto dto)
        {
            // =====================================
            // EXPERIENCE LETTER
            // =====================================

            var letter =
                await _context.ExperienceLetters
                    .FirstOrDefaultAsync(
                        x => x.Id ==
                             dto.ExperienceLetterId);

            if (letter == null)
            {
                throw new Exception(
                    "Experience Letter not found.");
            }


            // =====================================
            // EMPLOYEE
            // =====================================

            var employee =
                await _context.Employees
                    .FirstOrDefaultAsync(
                        x => x.Employee_Id ==
                             letter.EmployeeId);

            if (employee == null)
            {
                throw new Exception(
                    "Employee not found.");
            }

            if (string.IsNullOrWhiteSpace(employee.Email))
            {
                throw new Exception(
                    "Employee email not found.");
            }


            // =====================================
            // PDF
            // =====================================

            if (string.IsNullOrWhiteSpace(
                letter.PdfPath))
            {
                throw new Exception(
                    "Experience Letter PDF path is empty.");
            }

            var fullPath =
                Path.Combine(
                    _environment.WebRootPath,
                    letter.PdfPath.Replace(
                        "/",
                        Path.DirectorySeparatorChar
                            .ToString()));

            if (!File.Exists(fullPath))
            {
                throw new Exception(
                    "Experience Letter PDF not found.");
            }


            // =====================================
            // SEND EMAIL
            // =====================================

            await _emailService
                .SendEmailWithAttachment(
                    employee.Email,
                    dto.Subject,
                    dto.Body,
                    fullPath);


            // =====================================
            // UPDATE SEND STATUS
            // =====================================

            letter.Status = "Sent";

            letter.IsSent = true;

            letter.SentOn = DateTime.UtcNow;

            letter.SentCount += 1;

            await _context.SaveChangesAsync();
        }

        public async Task<ExperienceLetterSendStatusDto>
    GetSendStatusAsync(int id)
        {
            var letter =
                await _context.ExperienceLetters
                    .FirstOrDefaultAsync(
                        x => x.Id == id);

            if (letter == null)
            {
                throw new Exception(
                    "Experience Letter not found.");
            }

            var employee =
                await _context.Employees
                    .FirstOrDefaultAsync(
                        x => x.Employee_Id ==
                             letter.EmployeeId);

            return new ExperienceLetterSendStatusDto
            {
                ExperienceLetterId =
                    letter.Id,

                EmployeeId =
                    letter.EmployeeId,

                EmployeeName =
                    employee?.Name ?? "",

                Designation =
                    letter.Designation,

                IsSent =
                    letter.IsSent,

                SentCount =
                    letter.SentCount,

                SentOn =
                    letter.SentOn,

                Status =
                    letter.Status
            };
        }
        // =========================================
        // CALCULATE EMPLOYMENT TENURE
        // =========================================


        public async Task<ExperienceLetterDownloadDto?>
    DownloadExperienceLetterAsync(int id)
        {
            var letter =
                await _context.ExperienceLetters
                    .FirstOrDefaultAsync(
                        x => x.Id == id);

            if (letter == null)
                throw new Exception(
                    "Experience Letter not found.");

            if (string.IsNullOrWhiteSpace(
                letter.PdfPath))
            {
                throw new Exception(
                    "Experience Letter PDF path is empty.");
            }

            var fullPath =
                Path.Combine(
                    _environment.WebRootPath,
                    letter.PdfPath.Replace(
                        "/",
                        Path.DirectorySeparatorChar
                            .ToString()));

            if (!File.Exists(fullPath))
            {
                throw new Exception(
                    "Experience Letter PDF file not found.");
            }

            return new ExperienceLetterDownloadDto
            {
                FileBytes =
                    await File.ReadAllBytesAsync(
                        fullPath),

                FileName =
                    Path.GetFileName(fullPath)
            };
        }

        public async Task<byte[]>
    PreviewExperienceLetterAsync(int id)
        {
            var letter =
                await _context.ExperienceLetters
                    .FirstOrDefaultAsync(
                        x => x.Id == id);

            if (letter == null)
            {
                throw new Exception(
                    "Experience Letter not found.");
            }

            if (string.IsNullOrWhiteSpace(
                letter.PdfPath))
            {
                throw new Exception(
                    "Experience Letter PDF path is empty.");
            }

            var fullPath =
                Path.Combine(
                    _environment.WebRootPath,
                    letter.PdfPath.Replace(
                        "/",
                        Path.DirectorySeparatorChar
                            .ToString()));

            if (!File.Exists(fullPath))
            {
                throw new Exception(
                    "Experience Letter PDF not found.");
            }

            return await File.ReadAllBytesAsync(
                fullPath);
        }

        public async Task DeleteExperienceLetterAsync(
    int id)
        {
            var letter =
                await _context.ExperienceLetters
                    .FirstOrDefaultAsync(
                        x => x.Id == id);

            if (letter == null)
            {
                throw new Exception(
                    "Experience Letter not found.");
            }

            if (letter.Status == "Sent")
            {
                throw new Exception(
                    "Sent Experience Letter cannot be deleted.");
            }

            if (!string.IsNullOrWhiteSpace(
                letter.PdfPath))
            {
                var fullPath =
                    Path.Combine(
                        _environment.WebRootPath,
                        letter.PdfPath.Replace(
                            "/",
                            Path.DirectorySeparatorChar
                                .ToString()));

                if (File.Exists(fullPath))
                {
                    File.Delete(fullPath);
                }
            }

            _context.ExperienceLetters.Remove(
                letter);

            await _context.SaveChangesAsync();
        }
        private static string CalculateEmploymentTenure(
            DateTime startDate,
            DateTime endDate)
        {
            int years =
                endDate.Year -
                startDate.Year;

            int months =
                endDate.Month -
                startDate.Month;

            int days =
                endDate.Day -
                startDate.Day;

            if (days < 0)
            {
                months--;

                var previousMonth =
                    endDate.AddMonths(-1);

                days +=
                    DateTime.DaysInMonth(
                        previousMonth.Year,
                        previousMonth.Month);
            }

            if (months < 0)
            {
                years--;
                months += 12;
            }

            var parts =
                new List<string>();

            if (years > 0)
            {
                parts.Add(
                    years == 1
                        ? "1 Year"
                        : $"{years} Years");
            }

            if (months > 0)
            {
                parts.Add(
                    months == 1
                        ? "1 Month"
                        : $"{months} Months");
            }

            if (days > 0)
            {
                parts.Add(
                    days == 1
                        ? "1 Day"
                        : $"{days} Days");
            }

            if (parts.Count == 0)
            {
                return "1 Day";
            }

            return string.Join(
                " ",
                parts);
        }


        // =========================================
        // REPLACE BOOKMARK
        // =========================================

        public async Task<object> GetAllExperienceLettersAsync()
        {
            var letters =
                await _context.ExperienceLetters
                    .Join(
                        _context.Employees,

                        el => el.EmployeeId,

                        e => e.Employee_Id,

                        (el, e) => new
                        {
                            el.Id,

                            el.EmployeeId,

                            EmployeeName =
                                e.Name,

                            el.Title,

                            el.Designation,

                            el.Department,

                            el.StartDate,

                            el.EndDate,

                            el.EmploymentTenure,

                            el.SerialNo,

                            el.GeneratedDate,

                            el.Status,

                            el.IsSent,

                            el.SentOn,

                            el.SentCount
                        })
                    .OrderByDescending(
                        x => x.GeneratedDate)
                    .ToListAsync();

            return letters;
        }
        private void ReplaceBookmark(
     WordprocessingDocument doc,
     string bookmarkName,
     string text)
        {
            var bookmarkStart =
                doc.MainDocumentPart?
                    .Document
                    .Descendants<BookmarkStart>()
                    .FirstOrDefault(
                        b => b.Name?.Value == bookmarkName);

            if (bookmarkStart == null)
            {
                Console.WriteLine(
                    $"Bookmark not found: {bookmarkName}");

                return;
            }

            var bookmarkId =
                bookmarkStart.Id?.Value;

            if (string.IsNullOrWhiteSpace(bookmarkId))
                return;

            var bookmarkEnd =
                doc.MainDocumentPart?
                    .Document
                    .Descendants<BookmarkEnd>()
                    .FirstOrDefault(
                        b => b.Id?.Value == bookmarkId);

            if (bookmarkEnd == null)
            {
                Console.WriteLine(
                    $"BookmarkEnd not found: {bookmarkName}");

                return;
            }

            var parent =
                bookmarkStart.Parent;

            if (parent == null)
                return;


            // Preserve formatting from the existing run
            RunProperties? runProperties = null;

            var existingRun =
                bookmarkStart
                    .ElementsAfter()
                    .OfType<Run>()
                    .FirstOrDefault();

            if (existingRun?.RunProperties != null)
            {
                runProperties =
                    (RunProperties)
                    existingRun.RunProperties.CloneNode(true);
            }


            // Remove existing content between bookmark
            var current =
                bookmarkStart.NextSibling();

            while (
                current != null &&
                current != bookmarkEnd)
            {
                var next =
                    current.NextSibling();

                current.Remove();

                current = next;
            }


            // Create new run
            var newRun =
                new Run();

            if (runProperties != null)
            {
                newRun.RunProperties =
                    runProperties;
            }

            newRun.AppendChild(
                new Text(text ?? string.Empty)
                {
                    Space =
                        SpaceProcessingModeValues.Preserve
                });


            // Insert without changing paragraph/table alignment
            parent.InsertAfter(
                newRun,
                bookmarkStart);
        }
    }
}