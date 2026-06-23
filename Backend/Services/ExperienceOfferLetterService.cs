using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace EmployeeManagementSystem.Services
{
    public class ExperienceOfferLetterService : IOfferLetterService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public ExperienceOfferLetterService(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<OfferLetterResponseDto> GenerateAsync(OfferLetterRequestDto dto)
        {
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "ExperienceOfferLetterTemplate.docx");

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "GeneratedLetters");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName = $"OfferLetter_{dto.Candidate_Name}_{DateTime.Now:yyyyMMddHHmmss}.docx";
            var outputPath = Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            // =============================
            // Salary Calculations
            // =============================

            decimal annualCTC = dto.CTC_Annual;
            decimal monthlyCTC = annualCTC / 12;

            decimal basic = Math.Round(monthlyCTC * 0.40m, 2);
            decimal basicYearly = basic * 12;

            decimal hra = Math.Round(basic * 0.40m, 2);
            decimal hraYearly = hra * 12;

            decimal conveyance = 1600;
            decimal conveyanceYearly = conveyance * 12;

            decimal medicalAllowance = 1250;
            decimal medicalAllowanceYearly = medicalAllowance * 12;

            decimal employerPfMonthly = Math.Round(basic * 0.12m, 2);
            decimal employerPfAnnual = employerPfMonthly * 12;

            decimal gross = monthlyCTC - employerPfMonthly;
            decimal grossYearly = gross * 12;

            decimal otherAllowance = Math.Round(
                gross - (basic + hra + conveyance + medicalAllowance), 2);

            decimal otherAllowanceYearly = otherAllowance * 12;

            decimal providentfundMonthly = employerPfMonthly;
            decimal providentfundAnnual = providentfundMonthly * 12;

            decimal professionaltaxMonthly = 200;
            decimal professionaltaxAnnual = professionaltaxMonthly * 12;

            decimal netMonthly = gross - (providentfundMonthly + professionaltaxMonthly);
            decimal netAnnual = netMonthly * 12;

            // =============================
            // Replace Bookmarks
            // =============================

            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                var joiningDate = dto.Joining_Date.ToString("dd MMM yyyy");

                ReplaceBookmark(wordDoc, "Date", DateTime.Now.ToString("dd MMM yyyy"));
                ReplaceBookmark(wordDoc, "CandidateName", dto.Candidate_Name);
                ReplaceBookmark(wordDoc, "Address", dto.Address); // ✅ multi-line supported
                ReplaceBookmark(wordDoc, "JoiningDate", joiningDate);
                ReplaceBookmark(wordDoc, "DateOfJoining", joiningDate);
                ReplaceBookmark(wordDoc, "Position", dto.Position);

                ReplaceBookmark(wordDoc, "CTCAnnual",
                   annualCTC.ToString("N0", new CultureInfo("en-IN")) + "/-");

                ReplaceBookmark(wordDoc, "MonthlySalary",
                    monthlyCTC.ToString("N0", new CultureInfo("en-IN")) + "/-");

                ReplaceBookmark(wordDoc, "Basic", basic.ToString("F0"));
                ReplaceBookmark(wordDoc, "BasicYearly", basicYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "HRA", hra.ToString("F0"));
                ReplaceBookmark(wordDoc, "HRAYearly", hraYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "Conveyance", conveyance.ToString("F0"));
                ReplaceBookmark(wordDoc, "ConveyanceYearly", conveyanceYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "MedicalAllowance", medicalAllowance.ToString("F0"));
                ReplaceBookmark(wordDoc, "MedicalAllowanceYearly", medicalAllowanceYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "OtherAllowance", otherAllowance.ToString("F0"));
                ReplaceBookmark(wordDoc, "OtherAllowanceYearly", otherAllowanceYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "Gross", gross.ToString("F0"));
                ReplaceBookmark(wordDoc, "GrossYearly", grossYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "Gross1", gross.ToString("F0"));
                ReplaceBookmark(wordDoc, "GrossYearly1", grossYearly.ToString("F0"));

                ReplaceBookmark(wordDoc, "ProfessionalTax", professionaltaxMonthly.ToString("F0"));
                ReplaceBookmark(wordDoc, "ProfessionalTaxYearly", professionaltaxAnnual.ToString("F0"));

                ReplaceBookmark(wordDoc, "ProvidentFund", providentfundMonthly.ToString("F0"));
                ReplaceBookmark(wordDoc, "ProvidentFundYearly", providentfundAnnual.ToString("F0"));

                ReplaceBookmark(wordDoc, "NetTakeHome", netMonthly.ToString("F0"));
                ReplaceBookmark(wordDoc, "NetTakeHomeYearly", netAnnual.ToString("F0"));

                ReplaceBookmark(wordDoc, "ProvidentFund1", employerPfMonthly.ToString("F0"));
                ReplaceBookmark(wordDoc, "ProvidentFund1Yearly", employerPfAnnual.ToString("F0"));

                ReplaceBookmark(wordDoc, "MonthlyCTC", monthlyCTC.ToString("F0"));
                ReplaceBookmark(wordDoc, "CTCAnnual1", annualCTC.ToString("F0"));
            }

            // =============================
            // Convert DOCX to PDF
            // =============================

            var pdfPath = outputPath.Replace(".docx", ".pdf");

            var process = new System.Diagnostics.Process();
            process.StartInfo.FileName =
                @"C:\Program Files\LibreOffice\program\soffice.exe";

            process.StartInfo.Arguments =
                $"--headless --convert-to pdf \"{outputPath}\" --outdir \"{outputFolder}\"";

            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.CreateNoWindow = true;

            process.Start();
            process.WaitForExit();

            if (File.Exists(outputPath))
                File.Delete(outputPath);

            // =============================
            // Send Email
            // =============================

            await _emailService.SendEmailWithAttachment(
                dto.Email,
                "Offer Letter - EMS",
                "Dear Candidate,\n\nPlease find attached your offer letter.\n\nRegards,\nHR Team",
                pdfPath);

            // =============================
            // Save Record
            // =============================

            var offerLetter = new OfferLetter
            {
                Candidate_Name = dto.Candidate_Name,
                Email = dto.Email,
                Address = dto.Address,
                Position = dto.Position,
                Joining_Date = dto.Joining_Date,
                CTC_Annual = dto.CTC_Annual,
                Generated_On = DateTime.UtcNow,
                File_Path = pdfPath
            };

            _context.OfferLetters.Add(offerLetter);
            await _context.SaveChangesAsync();

            return new OfferLetterResponseDto
            {
                Success = true,
                Message = "Offer letter generated and sent successfully."
            };
        }

        // =============================
        // FIXED BOOKMARK METHOD
        // =============================

        private void ReplaceBookmark(
      WordprocessingDocument doc,
      string bookmarkName,
      string text)
        {
            var bookmark = doc.MainDocumentPart.RootElement
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == bookmarkName);

            if (bookmark == null) return;

            var run = bookmark.NextSibling<Run>();
            if (run == null) return;

            // 🔥 ADDRESS MULTI-LINE FIX
            if (bookmarkName == "Address")
            {
                var rawLines = text
                    .Replace("\r", "")
                    .Split(new[] { ',', '\n' });

                var lines = rawLines
                    .Select(x => x.Trim())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .ToList();

                run.RemoveAllChildren<Text>();

                for (int i = 0; i < lines.Count; i++)
                {
                    string value = lines[i];

                    if (i < lines.Count - 1)
                        value += ",";

                    run.Append(new Text(value));

                    if (i < lines.Count - 1)
                        run.Append(new Break());
                }
            }
            else
            {
                // ✅ FIXED
                run.RemoveAllChildren<Text>();
                run.Append(new Text(text));
            }
        }
    }
}

