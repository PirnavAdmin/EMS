using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using ClosedXML.Excel;
using System.IO;

namespace EmployeeManagementSystem.Services
{
    public class PaySlipService : IPaySlipService
    {
        private readonly AppDbContext _context;
        private readonly IAttendanceService _attendanceService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public PaySlipService(
            AppDbContext context,
            IAttendanceService attendanceService,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _attendanceService = attendanceService;
            _httpContextAccessor = httpContextAccessor;
        }

        //--------------------------------
        // GENERATE SINGLE PAYSLIP
        //--------------------------------
        public async Task<string> GeneratePaySlip(
            string employeeId,
            int year,
            string month,
            decimal OtherDeductions)

        {

            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.BankDetails)
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found");

            var personalInfo = await _context.EmployeePersonalInfos
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Employee_Id == employeeId);

            //--------------------------------
            // MONTH
            //--------------------------------
            if (!DateTime.TryParseExact(
                month.Trim(),
                "MMMM",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateTime parsedMonth))
            {
                throw new Exception($"Invalid month format: {month}");
            }

            int monthNumber = parsedMonth.Month;
            int yearValue = year;

            //--------------------------------
            // ATTENDANCE
            //--------------------------------
            var summary = await _attendanceService
                .GetMonthlyAttendanceSummary(
                    employee.Employee_Id,
                    monthNumber,
                    yearValue);

            int absentDays = summary.AbsentDays;

            decimal presentDays = summary.PresentDays;

            int totalDaysInMonth =
                DateTime.DaysInMonth(yearValue, monthNumber);

            int weekendDays =
                (int)(totalDaysInMonth -
                (presentDays + absentDays));

            int totalWorkingDays =
                (int)(presentDays + absentDays + weekendDays);

            

            int lopDays = summary.LopDays;

            decimal paidDays =
                presentDays + weekendDays;

            //--------------------------------
            // SALARY CALCULATIONS
            //--------------------------------
            decimal annualCTC = employee.CTC;

            decimal monthlyCTC = annualCTC / 12;

            decimal ratio =
                (decimal)paidDays / totalDaysInMonth;

            decimal basic =
                Math.Round((monthlyCTC * 0.3817m) * ratio);

            decimal hra =
                Math.Round((basic * 0.40m));

            decimal conveyance =
                Math.Round(1600 * ratio);

            decimal medical =
                Math.Round(1250 * ratio);

            decimal pf =
                Math.Round(basic * 0.12m);

            decimal gross =
                (monthlyCTC * ratio) - pf;

            decimal specialAllowance =
     Math.Floor(
         gross -
         (basic + hra + conveyance + medical));

            decimal totalEarnings =
                Math.Floor(
                    basic +
                    hra +
                    conveyance +
                    medical +
                    specialAllowance);

            decimal professionalTax = 200m;

            decimal totalDeductions =
                Math.Floor(
                    pf +
                    professionalTax +
                    OtherDeductions);

            decimal netSalary =
                Math.Floor(
                    totalEarnings - totalDeductions);

            if (netSalary < 0)
                netSalary = 0;

            string netSalaryWords =
                NumberToWords((long)netSalary) + " Only";

            //--------------------------------
            // TEMPLATE
            //--------------------------------
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "PaySlipTemplate.docx");

            EnsureValidWordTemplate(templatePath);

            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "wwwroot",
                "GeneratedPayslips");

            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var fileName =
    $"Payslip_{employee.Employee_Id}_{GetIndianTime():yyyyMMddHHmmssfff}_{Guid.NewGuid():N}.docx";

            var outputPath =
                Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);

            //--------------------------------
            // REPLACE BOOKMARKS
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                OpenGeneratedPayslip(outputPath))
            {
                var candidateName = personalInfo == null
    ? "-"
    : $"{personalInfo.FirstName} {personalInfo.LastName}".Trim();

                if (string.IsNullOrWhiteSpace(candidateName))
                    candidateName = "-";

                ReplaceBookmark(
                    wordDoc,
                    "CandidateName",
                    candidateName);

                ReplaceBookmark(
                    wordDoc,
                    "EmployeeID",
                    employee.Employee_Id ?? "-");

                ReplaceBookmark(
                   wordDoc,
                   "Position",
                   string.IsNullOrWhiteSpace(
                       personalInfo?.Designation)
                   ? "-"
                   : personalInfo.Designation);

                ReplaceBookmark(
                    wordDoc,
                    "Department",
                    employee.Department ?? "-");

                ReplaceBookmark(
                    wordDoc,
                    "Month",
                    $"{month.ToUpper()} {year}");


                ReplaceBookmark(
                   wordDoc,
                   "Gender",
                   string.IsNullOrWhiteSpace(
                       personalInfo?.Gender)
                   ? "-"
                   : personalInfo.Gender);


                ReplaceBookmark(
                    wordDoc,
                    "BankAccountNumber",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.Account_Number)
                    ? "-"
                    : employee.BankDetails.Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "BankName",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.Bank_Name)
                    ? "-"
                    : employee.BankDetails.Bank_Name);

                ReplaceBookmark(
                    wordDoc,
                    "UAN",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.UAN_Number)
                    ? "-"
                    : employee.BankDetails.UAN_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PF",
                    string.IsNullOrWhiteSpace(
                        employee.BankDetails?.PF_Account_Number)
                    ? "-"
                    : employee.BankDetails.PF_Account_Number);

                ReplaceBookmark(
                    wordDoc,
                    "PAN",
                    string.IsNullOrWhiteSpace(
                        personalInfo?.PanNumber)
                    ? "-"
                    : personalInfo.PanNumber);

                ReplaceBookmark(
                     wordDoc,
                    "Location",
                    "Hyderabad");

                ReplaceBookmark(
                    wordDoc,
                    "JoiningDate",
                    employee.JoiningDate
                        .ToString("dd/MM/yyyy"));

                //--------------------------------
                // EARNINGS
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "Basic",
                    basic.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "HRA",
                    hra.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "ConveyanceAllowance",
                    conveyance.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "Medical",
                    medical.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "Special",
                    specialAllowance.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "TotalEarnings",
                    totalEarnings.ToString("N2"));

                //--------------------------------
                // DEDUCTIONS
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "PFAmount",
                    pf.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "ProfessionalTax",
                    professionalTax.ToString("N2"));


                ReplaceBookmark(
                    wordDoc,
                    "OtherDeduction",
                    OtherDeductions.ToString("N2")
                );

                ReplaceBookmark(
                    wordDoc,
                    "TotalDeduction",
                    totalDeductions.ToString("N2"));

                //--------------------------------
                // FINAL
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "NetSalary",
                    netSalary.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "InWords",
                    netSalaryWords);

                //--------------------------------
                // ATTENDANCE
                //--------------------------------
                ReplaceBookmark(
                    wordDoc,
                    "TotalWorkingDays",
                    totalWorkingDays.ToString());

                ReplaceBookmark(
                    wordDoc,
                    "LOPDays",
                    lopDays.ToString());

                ReplaceBookmark(
                    wordDoc,
                    "PaidDays",
                    paidDays.ToString());
            }

            //--------------------------------
            // DOCX → PDF
            //--------------------------------
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
            // SAVE DB
            //--------------------------------
            var payslip = new PaySlip
            {
                EmployeeId = employee.Employee_Id,
                Month = month,
                Year = year,
                CTC = employee.CTC,
                GrossSalary = gross,
                NetSalary = netSalary,
                TotalDeductions = totalDeductions,
                OtherDeductions = OtherDeductions,
                FilePath = pdfPath,
                Generated_On = GetIndianTime()
            };

            _context.PaySlips.Add(payslip);

            await _context.SaveChangesAsync();

            //--------------------------------
            // RETURN URL
            //--------------------------------
            var request =
                _httpContextAccessor.HttpContext?.Request;

            var baseUrl =
                request != null
                ? $"{request.Scheme}://{request.Host}"
                : "";

            var fileNameOnly =
                Path.GetFileName(pdfPath);

            return baseUrl +
                   $"/GeneratedPayslips/{fileNameOnly}";
        }

        //--------------------------------
        // BULK GENERATION
        //--------------------------------
        public async Task<List<string>>
            GenerateAllPaySlips(int year, string month)
        {
            var employeeIds = await _context.Employees
                .AsNoTracking()
                .Select(e => e.Employee_Id)
                .ToListAsync();

            var result = new List<string>();

            foreach (var empId in employeeIds)
            {
                var filePath =
                    await GeneratePaySlip(
                        empId,
                        year,
                        month,
                        0);

                result.Add(filePath);
            }

            return result;
        }

        //--------------------------------
        // GET RECENT
        //--------------------------------
        public async Task<List<PaySlip>>
            GetRecentPayslips()
        {
            return await _context.PaySlips
                .OrderByDescending(x => x.Id)
                .ToListAsync();
        }

        //--------------------------------
        // BOOKMARK REPLACE
        //--------------------------------
        private void ReplaceBookmark(
            WordprocessingDocument doc,
            string name,
            string text)
        {
            var bookmark =
                doc.MainDocumentPart.RootElement
                .Descendants<BookmarkStart>()
                .FirstOrDefault(b => b.Name == name);

            if (bookmark != null)
            {
                var run =
                    bookmark.NextSibling<Run>();

                if (run != null)
                {
                    run.RemoveAllChildren<Text>();

                    run.Append(
                        new Text(text ?? "-"));
                }
            }
        }

        private static void EnsureValidWordTemplate(string templatePath)
        {
            if (!File.Exists(templatePath))
                throw new InvalidOperationException(
                    $"Payslip template not found on server: {templatePath}");

            try
            {
                using var template =
                    WordprocessingDocument.Open(templatePath, false);
            }
            catch (FileFormatException ex)
            {
                throw new InvalidOperationException(
                    $"Payslip template is corrupted or not a valid .docx file on server: {templatePath}. Replace PaySlipTemplate.docx and rebuild/redeploy.",
                    ex);
            }
        }

        private static WordprocessingDocument OpenGeneratedPayslip(string outputPath)
        {
            try
            {
                return WordprocessingDocument.Open(outputPath, true);
            }
            catch (FileFormatException ex)
            {
                throw new InvalidOperationException(
                    $"Generated payslip document is corrupted before PDF conversion: {outputPath}. This can happen if the template is invalid or concurrent requests overwrite the same output file.",
                    ex);
            }
        }

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

        public static string NumberToWords(
            long number)
        {
            if (number == 0)
                return "Zero";

            string words = "";

            if ((number / 100000) > 0)
            {
                words +=
                    NumberToWords(number / 100000)
                    + " Lakh ";

                number %= 100000;
            }

            if ((number / 1000) > 0)
            {
                words +=
                    NumberToWords(number / 1000)
                    + " Thousand ";

                number %= 1000;
            }

            if ((number / 100) > 0)
            {
                words +=
                    NumberToWords(number / 100)
                    + " Hundred ";

                number %= 100;
            }

            if (number > 0)
            {
                var units = new[]
                {
                    "Zero","One","Two","Three",
                    "Four","Five","Six","Seven",
                    "Eight","Nine","Ten",
                    "Eleven","Twelve","Thirteen",
                    "Fourteen","Fifteen",
                    "Sixteen","Seventeen",
                    "Eighteen","Nineteen"
                };

                var tens = new[]
                {
                    "Zero","Ten","Twenty",
                    "Thirty","Forty","Fifty",
                    "Sixty","Seventy",
                    "Eighty","Ninety"
                };

                if (number < 20)
                {
                    words += units[number];
                }
                else
                {
                    words += tens[number / 10];

                    if ((number % 10) > 0)
                    {
                        words +=
                            " " +
                            units[number % 10];
                    }
                }
            }

            return words;
        }
        public async Task<byte[]> DownloadSalaryRegister(
    string month,
    int year)
        {
            var payslips = await _context.PaySlips
                .Where(x => x.Month == month &&
                            x.Year == year)
                .ToListAsync();

            using var workbook = new XLWorkbook();

            var sheet = workbook.Worksheets
                .Add("Salary Register");

            sheet.Cell(1, 1).Value =
                $"Salary Register - {month} {year}";
            sheet.Cell(1, 1).Style.Font.Bold = true;
            sheet.Cell(1, 1).Style.Font.FontSize = 16;
            sheet.Cell(2, 1).Value =
    $"Total Employees : {payslips.Count}";
            sheet.Cell(2, 3).Value =
    $"Total Gross Salary : {payslips.Sum(x => x.GrossSalary ?? 0):N2}";
            sheet.Cell(2, 6).Value =
    $"Total Deductions : {payslips.Sum(x => x.TotalDeductions ?? 0):N2}";
            sheet.Cell(2, 8).Value =
    $"Total Net Salary : {payslips.Sum(x => x.NetSalary ?? 0):N2}";
            var totalGross =
    payslips.Sum(x => x.GrossSalary ?? 0);

            var totalDeductions =
                payslips.Sum(x => x.TotalDeductions ?? 0);

            var totalNet =
                payslips.Sum(x => x.NetSalary ?? 0);

            var grandTotal =
                totalGross + totalDeductions + totalNet;

            sheet.Cell(2, 10).Value =
                $"Grand Total : {grandTotal:N2}";

            sheet.Range(1, 1, 1, 9)
                .Merge();

            sheet.Cell(3, 1).Value =
                "Employee ID";

            sheet.Cell(3, 2).Value =
                "Employee Name";

            sheet.Cell(3, 3).Value =
                "Department";

            sheet.Cell(3, 4).Value =
                "Month";

            sheet.Cell(3, 5).Value =
                "Year";

            sheet.Cell(3, 6).Value =
                "Gross Salary";

            sheet.Cell(3, 7).Value =
                "Total Deductions";

            sheet.Cell(3, 8).Value =
                "Other Deductions";

            sheet.Cell(3, 9).Value =
                "Net Salary";

            var header =
                sheet.Range(3, 1, 3, 9);
            sheet.RangeUsed().SetAutoFilter();
            sheet.SheetView.FreezeRows(3);

            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor =
                XLColor.DarkBlue;

            header.Style.Font.FontColor =
                XLColor.White;

            int row = 4;

            foreach (var pay in payslips)
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(e =>
                        e.Employee_Id ==
                        pay.EmployeeId);

                sheet.Cell(row, 1).Value =
                    pay.EmployeeId;

                sheet.Cell(row, 2).Value =
                    employee?.Name ?? "";

                sheet.Cell(row, 3).Value =
                    employee?.Department ?? "";

                sheet.Cell(row, 4).Value =
                    pay.Month;

                sheet.Cell(row, 5).Value =
                    pay.Year;

                sheet.Cell(row, 6).Value =
                    pay.GrossSalary ?? 0;

                sheet.Cell(row, 7).Value =
                    pay.TotalDeductions ?? 0;

                sheet.Cell(row, 8).Value =
                    pay.OtherDeductions ?? 0;

                sheet.Cell(row, 9).Value =
                    pay.NetSalary ?? 0;

                row++;
            }

            sheet.Columns()
                .AdjustToContents();
            var pfSheet = workbook.Worksheets
    .Add("PF Report");
            pfSheet.Cell(1, 1).Value =
    $"PF Report - {month} {year}";

            pfSheet.Cell(1, 1).Style.Font.Bold = true;
            pfSheet.Cell(1, 1).Style.Font.FontSize = 16;

            decimal totalPf = 0;

            foreach (var pay in payslips)
            {
                decimal monthlyCTC =
                    (pay.CTC ?? 0) / 12;

                decimal basic =
                    Math.Round(monthlyCTC * 0.3817m);

                decimal pf =
                    Math.Round(basic * 0.12m);

                totalPf += pf;
            }

            pfSheet.Cell(2, 1).Value =
                $"Total Employees : {payslips.Count}";

            pfSheet.Cell(2, 4).Value =
                $"Total PF Amount : {totalPf:N0}";
            pfSheet.Cell(4, 1).Value = "Employee ID";
            pfSheet.Cell(4, 2).Value = "Employee Name";
            pfSheet.Cell(4, 3).Value = "Department";
            pfSheet.Cell(4, 4).Value = "CTC";
            pfSheet.Cell(4, 5).Value = "Basic Salary";
            pfSheet.Cell(4, 6).Value = "PF Amount";

            var pfHeader = pfSheet.Range(4, 1, 4, 6);

            pfHeader.Style.Font.Bold = true;
            pfHeader.Style.Fill.BackgroundColor =
                XLColor.DarkBlue;

            pfHeader.Style.Font.FontColor =
                XLColor.White;

            int pfRow = 5;

            foreach (var pay in payslips)
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(e =>
                        e.Employee_Id == pay.EmployeeId);

                decimal monthlyCTC =
                    (pay.CTC ?? 0) / 12;

                decimal basic =
                    Math.Round(monthlyCTC * 0.3817m);

                decimal pf =
                    Math.Round(basic * 0.12m);

                pfSheet.Cell(pfRow, 1).Value =
                    pay.EmployeeId;

                pfSheet.Cell(pfRow, 2).Value =
                    employee?.Name ?? "";

                pfSheet.Cell(pfRow, 3).Value =
                    employee?.Department ?? "";

                pfSheet.Cell(pfRow, 4).Value =
                    pay.CTC ?? 0;

                pfSheet.Cell(pfRow, 5).Value =
                    basic;

                pfSheet.Cell(pfRow, 6).Value =
                    pf;

                pfRow++;
            }

            pfSheet.Columns()
                .AdjustToContents();

            using var stream =
                new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }

    }
}
