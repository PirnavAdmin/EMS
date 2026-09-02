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

        private readonly IEmailService _emailService;

        private readonly ITemplateService _templateService;//vishnu

        public ManualPayslipService(

   AppDbContext context,

   IEmailService emailService,

   ITemplateService templateService)

        {

            _context = context;

            _emailService = emailService;

            _templateService = templateService;

        }


        public async Task<string> GenerateManualPaySlip(ManualPaySlipDto dto)
        {
            //--------------------------------
            // FETCH EMPLOYEE
            //--------------------------------
            //var employee = await _context.Employees
            //    .Include(e => e.BankDetails)
            //    .FirstOrDefaultAsync(e => e.Employee_Id == dto.EmployeeId);

            //if (employee == null)
            //    throw new Exception("Employee not found");

            var employee = await _context.Employees

.Include(e => e.BankDetails)

.FirstOrDefaultAsync(e =>

e.Employee_Id == dto.EmployeeId &&

e.Status == "Active");

            if (employee == null)

                throw new Exception("Employee is inactive or not found");


            var personalInfo = await _context.EmployeePersonalInfos
                .FirstOrDefaultAsync(p => p.Employee_Id == dto.EmployeeId);

            var fullEmployeeName = string.Join(
    " ",
    new[]
    {
        personalInfo?.FirstName,
        personalInfo?.MiddleName,
        personalInfo?.LastName
    }
    .Where(x => !string.IsNullOrWhiteSpace(x))
).Trim();

            if (string.IsNullOrWhiteSpace(fullEmployeeName))
            {
                fullEmployeeName = employee.Name ?? employee.Employee_Id;
            }


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
            // SALARY STRUCTURE
            //--------------------------------

            var salaryStructure = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == dto.EmployeeId &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (salaryStructure == null)
            {
                throw new Exception(
                    $"Salary structure not found for employee {dto.EmployeeId}.");
            }

            //--------------------------------
            // ATTENDANCE RATIO
            //--------------------------------

            decimal ratio =
                totalWorkingDays == 0
                    ? 0
                    : paidDays / totalWorkingDays;


            //--------------------------------
            // SALARY STRUCTURE VALUES
            //--------------------------------

            decimal annualCTC =
                salaryStructure.AnnualCTC;

            decimal monthlyCTC =
                salaryStructure.MonthlyCTC;

            decimal fullBasic =
                salaryStructure.BasicSalary;

            decimal fullHRA =
                salaryStructure.HRA;

            decimal fullConveyance =
                salaryStructure.ConveyanceAllowance;

            decimal fullMedical =
                salaryStructure.MedicalAllowance;

            decimal fullSpecialAllowance =
                salaryStructure.SpecialAllowance;

            //--------------------------------
            // EARNINGS AFTER ATTENDANCE / LOP
            //--------------------------------

            decimal basic =
                RoundSalary(fullBasic * ratio);

            decimal hra =
                RoundSalary(fullHRA * ratio);

            decimal conveyance =
                RoundSalary(fullConveyance * ratio);

            decimal medical =
                RoundSalary(fullMedical * ratio);

            decimal specialAllowance =
                RoundSalary(fullSpecialAllowance * ratio);


            //--------------------------------
            // TOTAL EARNINGS
            //--------------------------------

            decimal totalEarnings =
                RoundSalary(
                    basic +
                    hra +
                    conveyance +
                    medical +
                    specialAllowance);

            decimal gross = totalEarnings;

            //--------------------------------
            // LOP DEDUCTION
            //--------------------------------

            decimal fullMonthlyEarnings =
                fullBasic +
                fullHRA +
                fullConveyance +
                fullMedical +
                fullSpecialAllowance;

            decimal lopDeduction =
                RoundSalary(
                    fullMonthlyEarnings - totalEarnings);

            if (lopDeduction < 0)
                lopDeduction = 0;
         
            //--------------------------------
            // PF
            //--------------------------------

            decimal pf =
                RoundSalary(
                    salaryStructure.EmployeePF * ratio);

            //--------------------------------
            // PROFESSIONAL TAX
            //--------------------------------

            decimal professionalTax =
                RoundSalary(
                    salaryStructure.ProfessionalTax);
            //--------------------------------
            // TDS
            //--------------------------------
            if (dto.TDSPercentage < 0 || dto.TDSPercentage > 100)
            {
                throw new Exception(
                    "TDS percentage must be between 0 and 100.");
            }

            //--------------------------------
            // TDS
            //--------------------------------

            decimal tdsAmount =
                RoundSalary(
                    salaryStructure.TDS);
            //--------------------------------
            // PROFESSIONAL TAX
            //--------------------------------
          

            
            //--------------------------------
            // TOTAL DEDUCTIONS
            //--------------------------------
            //--------------------------------
            // OTHER DEDUCTIONS
            //--------------------------------

            decimal totalOtherDeduction =
                RoundSalary(
                    salaryStructure.OtherDeduction +
                    dto.OtherDeductions);

            decimal totalDeductions =
                RoundSalary(
                    pf +
                    professionalTax +
                    tdsAmount +
                    totalOtherDeduction);

            //--------------------------------
            // NET SALARY
            //--------------------------------
            //--------------------------------
            // NET SALARY
            //--------------------------------

            decimal netSalary =
                RoundSalary(
                    totalEarnings - totalDeductions);

            if (netSalary < 0)
                netSalary = 0;

            string netSalaryWords =
                "Rupees " +
                NumberToWords((long)Math.Floor(netSalary)) +
                " Only";




            //--------------------------------
            // FILE PATH
            //--------------------------------
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "PaySlipTemplate.docx");


            // --------------------------------

            // GET PAYSLIP TEMPLATE

            // --------------------------------

            //int companyId = 1;

            //var template = await _templateService

            //    .GetActiveTemplateAsync(companyId, "PAYSLIP");

            //if (template == null)

            //{

            //    throw new Exception(

            //        "Payslip template not found. Please upload and set a default PAYSLIP template.");

            //}

            //if (string.IsNullOrWhiteSpace(template.FilePath))

            //{

            //    throw new Exception("Payslip template file path is empty.");

            //}

            //var templatePath = Path.Combine(

            //    Directory.GetCurrentDirectory(),

            //    "wwwroot",

            //    template.FilePath.TrimStart('/'));

            //if (!File.Exists(templatePath))

            //{

            //    throw new Exception(

            //        $"Payslip template file not found: {templatePath}");

            //}

            ////


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
            string deductionLabel =
    string.IsNullOrWhiteSpace(dto.DeductionLabel)
    ? "Other Deductions"
    : dto.DeductionLabel;


            //--------------------------------
            // WORD BOOKMARKS (UNCHANGED)
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
            {
                ReplaceBookmark(
    wordDoc,
    "CandidateName",
    fullEmployeeName);
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
                ReplaceBookmark(
    wordDoc,
    "TDS",
    tdsAmount.ToString("N2"));

                ReplaceBookmark(
    wordDoc,
    "PayPeriod",
    $"{dto.Month.ToUpper()} {dto.Year}");

                //--------------------------------
                // TOTALS
                //--------------------------------
                ReplaceBookmark(wordDoc, "TotalEarnings", totalEarnings.ToString("N2"));
                ReplaceBookmark(
     wordDoc,
     "DeductionType",
     deductionLabel);

                ReplaceBookmark(
     wordDoc,
     "OtherDeduction",
     totalOtherDeduction.ToString("N2"));
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
                ReplaceBookmark(
    wordDoc,
    "LOPDeduction",
    lopDeduction.ToString("N2"));
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
            //vishnu change

            await _context.SaveChangesAsync();
            var employeeName = fullEmployeeName;

            // Notification Settings Check

            var notification = await _context.NotificationSettings

                 .AsNoTracking()

                 .FirstOrDefaultAsync();

            if (notification != null &&

                 notification.EnableEmailNotifications &&

                 notification.EnablePayslipEmails)

            {

                await _emailService.SendPayslipEmail(

                    employee.Email,

                    employeeName,

                    dto.Month,

                    dto.Year,

                    pdfPath);

            }

            //


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
        private static decimal RoundSalary(decimal amount)
        {
            return Math.Round(
                amount,
                0,
                MidpointRounding.AwayFromZero);
        }
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