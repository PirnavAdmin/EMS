using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;

namespace EmployeeManagementSystem.Services
{
    public class ManualPayslipService : IManualPayslipService
    {
        private readonly AppDbContext _context;

        public ManualPayslipService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateManualPaySlip(ManualPaySlipDto dto)
        {
            //--------------------------------
            // FETCH EMPLOYEE
            //--------------------------------
            var employee = await _context.Employees
                .Include(e => e.BankDetails)
                .FirstOrDefaultAsync(e => e.Employee_Id == dto.EmployeeId);

            if (employee == null)
                throw new Exception("Employee not found");

            var personalInfo = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(p => p.Employee_Id == dto.EmployeeId);


            //--------------------------------
            // MANUAL INPUTS (FROM DTO)
            //--------------------------------
            // ✅ Get actual days in month
            int monthNumber = DateTime.ParseExact(dto.Month, "MMMM", null).Month;
            int totalDaysInMonth = DateTime.DaysInMonth(dto.Year, monthNumber);

            // ✅ Use system value instead of user input
            int totalWorkingDays = totalDaysInMonth;

            // ✅ Keep LOP from user
            int lopDays = dto.LOPDays;

            // ✅ Validation
            if (lopDays > totalWorkingDays)
                throw new Exception("LOP cannot exceed working days");

            // ✅ Calculate paid days correctly
            decimal paidDays = totalWorkingDays - lopDays;

            //--------------------------------
            decimal annualCTC = employee.CTC;

            decimal monthlyCTC = annualCTC / 12;

            // ✅ SAME AS AUTO
            decimal ratio = (decimal)paidDays / totalWorkingDays;
            decimal basic = Math.Round((monthlyCTC * 0.3817m) * ratio);

            decimal hra = Math.Round((basic * 0.40m));

            decimal conveyance = Math.Round(1600 * ratio);

            decimal medical = Math.Round(1250 * ratio);

            decimal pf = Math.Round(basic * 0.12m);

            // ✅ KEEP THIS (your system logic)
            decimal gross = (monthlyCTC * ratio) - pf;

            decimal specialAllowance =
                gross - (basic + hra + conveyance + medical);

            decimal totalEarnings =
                basic + hra + conveyance + medical + specialAllowance;

            decimal professionalTax = 200;

            decimal totalDeductions =
                pf + professionalTax + dto.OtherDeductions;

            decimal netSalary =
                totalEarnings - totalDeductions;

            if (netSalary < 0)
                netSalary = 0;

            string netSalaryWords =
                NumberToWords((long)netSalary) + " Only";


            //--------------------------------
            // FILE PATH
            //--------------------------------
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "PaySlipTemplate.docx");

            var outputFolder = Path.Combine(
      Directory.GetCurrentDirectory(),
      "wwwroot",
      "GeneratedPayslips");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName =
                $"Payslip_{employee.Employee_Id}_{GetIndianTime():yyyyMMddHHmmss}.docx";

            var outputPath = Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);


            //--------------------------------
            // WORD BOOKMARKS (UNCHANGED)
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                ReplaceBookmark(wordDoc, "CandidateName", employee.Name);
                ReplaceBookmark(wordDoc, "EmployeeID", employee.Employee_Id);
                
                ReplaceBookmark(wordDoc, "Department", employee.Department);
                ReplaceBookmark(wordDoc, "Month", $"{dto.Month.ToUpper()} {dto.Year}");

                ReplaceBookmark(wordDoc, "JoiningDate",
                    employee.JoiningDate.ToString("dd/MM/yyyy"));

                ReplaceBookmark(wordDoc, "BankAccountNumber",
                    employee.BankDetails?.Account_Number ?? "");

                ReplaceBookmark(wordDoc, "BankName",
                    employee.BankDetails?.Bank_Name ?? "");

                ReplaceBookmark(wordDoc, "UAN",
                    employee.BankDetails?.UAN_Number ?? "");

                ReplaceBookmark(wordDoc, "PF",
                    employee.BankDetails?.PF_Account_Number ?? "");

                ReplaceBookmark(wordDoc, "PAN",
                    personalInfo?.PanNumber ?? "");

                ReplaceBookmark(
                     wordDoc,
                    "Location",
                    "Hyderabad");
                ReplaceBookmark(
                   wordDoc,
                   "Gender",
                   string.IsNullOrWhiteSpace(
                       personalInfo?.Gender)
                   ? "-"
                   : personalInfo.Gender);

                //--------------------------------
                // EARNINGS
                //--------------------------------
                ReplaceBookmark(wordDoc, "Basic", basic.ToString("N2"));
                ReplaceBookmark(wordDoc, "HRA", hra.ToString("N2"));
                ReplaceBookmark(wordDoc, "ConveyanceAllowance", conveyance.ToString("N2"));
                ReplaceBookmark(wordDoc, "Medical", medical.ToString("N2"));
                ReplaceBookmark(wordDoc, "Special", specialAllowance.ToString("N2"));

                ReplaceBookmark(
                   wordDoc,
                   "Gender",
                   string.IsNullOrWhiteSpace(
                       personalInfo?.Gender)
                   ? "-"
                   : personalInfo.Gender);

                ReplaceBookmark(
                 wordDoc,
                 "Position",
                 string.IsNullOrWhiteSpace(
                     personalInfo?.Designation)
                 ? "-"
                 : personalInfo.Designation);

                //--------------------------------
                // TOTALS
                //--------------------------------
                ReplaceBookmark(wordDoc, "TotalEarnings", totalEarnings.ToString(   "N2"));
                ReplaceBookmark(wordDoc, "OtherDeduction", dto.OtherDeductions.ToString("N2"));
                ReplaceBookmark(wordDoc, "TotalDeduction", totalDeductions.ToString("N2"));
                ReplaceBookmark(wordDoc, "NetSalary", netSalary.ToString("N2"));

                //--------------------------------
                // DEDUCTIONS
                //--------------------------------
                ReplaceBookmark(wordDoc, "ProfessionalTax", professionalTax.ToString("N2"));
                ReplaceBookmark(wordDoc, "PFAmount", pf.ToString("N2"));

                //--------------------------------
                // FINAL
                //--------------------------------
                ReplaceBookmark(wordDoc, "InWords", netSalaryWords);

                //--------------------------------
                // DAYS (MANUAL)
                //--------------------------------
                ReplaceBookmark(wordDoc, "TotalWorkingDays", totalWorkingDays.ToString());
                ReplaceBookmark(wordDoc, "LOPDays", lopDays.ToString());
                ReplaceBookmark(wordDoc, "PaidDays", paidDays.ToString());
            }

            //--------------------------------
            // DOCX → PDF
            //--------------------------------
            var pdfPath =
               outputPath.Replace(".docx", ".pdf");

            var sofficePath =
                RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                ? @"C:\Program Files\LibreOffice\program\soffice.exe"
                : "/usr/bin/soffice";

            using var process = new Process();

            process.StartInfo.FileName = sofficePath;

            process.StartInfo.Arguments =
                $"--headless --convert-to pdf \"{outputPath}\" --outdir \"{outputFolder}\"";

            process.StartInfo.CreateNoWindow = true;
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;

            process.Start();

            await process.WaitForExitAsync();

            if (!File.Exists(pdfPath))
            {
                string error = await process.StandardError.ReadToEndAsync();

                throw new Exception(
                    $"PDF generation failed. {error}");
            }

            if (File.Exists(outputPath))
                File.Delete(outputPath);

            //--------------------------------
            // SAVE TO DB
            //--------------------------------
            var payslip = new PaySlip
            {
                EmployeeId = employee.Employee_Id,
                CTC = employee.CTC,
                Month = dto.Month,
                Year = dto.Year,
                GrossSalary = gross,
                NetSalary = netSalary,
                TotalDeductions = totalDeductions,
                OtherDeductions = dto.OtherDeductions,
                FilePath = pdfPath,
                Generated_On = GetIndianTime()
            };

            _context.PaySlips.Add(payslip);
            await _context.SaveChangesAsync();

            return $"/GeneratedPayslips/{Path.GetFileName(pdfPath)}";
        }

        //--------------------------------
        // PDF CONVERSION
        //--------------------------------
        //private void ConvertDocxToPdf(string docxPath, string pdfPath)
        //{
        //    var sofficePath = @"C:\Program Files\LibreOffice\program\soffice.exe";

        //    var process = new Process();

        //    process.StartInfo.FileName = sofficePath;
        //    process.StartInfo.Arguments =
        //        $"--headless --convert-to pdf --outdir \"{Path.GetDirectoryName(pdfPath)}\" \"{docxPath}\"";

        //    process.StartInfo.CreateNoWindow = true;
        //    process.StartInfo.UseShellExecute = false;

        //    process.Start();
        //    process.WaitForExit();
        //}

        //--------------------------------
        // NUMBER TO WORDS
        //--------------------------------

        private DateTime GetIndianTime()
        {
            TimeZoneInfo indiaZone =
                TimeZoneInfo.FindSystemTimeZoneById(
                    RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? "India Standard Time"
                    : "Asia/Kolkata");

            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                indiaZone);
        }
        public static string NumberToWords(long number)
        {
            if (number == 0)
                return "Zero";

            string words = "";

            if ((number / 100000) > 0)
            {
                words += NumberToWords(number / 100000) + " Lakh ";
                number %= 100000;
            }

            if ((number / 1000) > 0)
            {
                words += NumberToWords(number / 1000) + " Thousand ";
                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words += NumberToWords(number / 100) + " Hundred ";
                number %= 100;
            }

            if (number > 0)
            {
                var unitsMap = new[]
                {
                    "Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
                    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen",
                    "Sixteen","Seventeen","Eighteen","Nineteen"
                };

                var tensMap = new[]
                {
                    "Zero","Ten","Twenty","Thirty","Forty","Fifty",
                    "Sixty","Seventy","Eighty","Ninety"
                };

                if (number < 20)
                    words += unitsMap[number];
                else
                {
                    words += tensMap[number / 10];
                    if ((number % 10) > 0)
                        words += " " + unitsMap[number % 10];
                }
            }

            return words;
        }

        //--------------------------------
        // BOOKMARK HELPER
        //--------------------------------
        private void ReplaceBookmark(
            WordprocessingDocument doc,
            string bookmarkName,
            string text)
        {
            var bookmark = doc.MainDocumentPart.RootElement
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == bookmarkName);

            if (bookmark != null)
            {
                var run = bookmark.NextSibling<Run>();

                if (run != null)
                {
                    var textElement = run.GetFirstChild<Text>();

                    if (textElement != null)
                        textElement.Text = text;
                }
            }
        }
    }
}