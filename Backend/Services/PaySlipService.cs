
using ClosedXML.Excel;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Documents;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using Hangfire;

using System.IO;
using System.Runtime.InteropServices;

namespace EmployeeManagementSystem.Services
{

    public class PaySlipService : IPaySlipService

    {

        private readonly AppDbContext _context;

        private readonly IAttendanceService _attendanceService;

        private readonly IHttpContextAccessor _httpContextAccessor;

        private readonly IEmailService _emailService;

        private readonly IServiceScopeFactory _scopeFactory;

        private readonly ITemplateService _templateService;//vishnu

        public PaySlipService(

    AppDbContext context,

    IAttendanceService attendanceService,

    IHttpContextAccessor httpContextAccessor,

    IEmailService emailService,

    IServiceScopeFactory scopeFactory,

    ITemplateService templateService)

        {

            _context = context;

            _attendanceService = attendanceService;

            _httpContextAccessor = httpContextAccessor;

            _emailService = emailService;

            _scopeFactory = scopeFactory;

            _templateService = templateService;

        }


        //--------------------------------
        // GENERATE SINGLE PAYSLIP
        //--------------------------------

        public async Task<string> GeneratePaySlip(
    string employeeId,
    int year,
    string month,
    decimal OtherDeductions,
    string? DeductionLabel,
    decimal TDSPercentage = 0,
    bool sendEmail = true)

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
            // CHECK DUPLICATE PAYSLIP
            //--------------------------------

      //      bool alreadyExists = await _context.PaySlips
      //.AsNoTracking()
      //.AnyAsync(x =>
      //    x.EmployeeId == employeeId &&
      //    x.Year == yearValue &&
      //    x.Month == month);

      //      if (alreadyExists)
      //      {
      //          Console.WriteLine(
      //              $"Payslip already exists. Skipping: " +
      //              $"{employeeId} - {month} {yearValue}");

      //          return string.Empty;
      //      }

            //--------------------------------
            // SALARY STRUCTURE
            //--------------------------------



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

            int payrollDays = summary.PayrollDays;

            int totalWorkingDays = summary.PayrollDays;

            int lopDays = summary.LopDays;

            decimal paidDays = summary.PayableDays;

            //--------------------------------
            // SALARY CALCULATIONS
            //--------------------------------
            //        decimal annualCTC = employee.CTC;

            //        decimal monthlyCTC = annualCTC / 12;
            //        if (TDSPercentage < 0 || TDSPercentage > 100)
            //        {
            //            throw new Exception(
            //                "TDS percentage must be between 0 and 100.");
            //        }
            //        decimal ratio =
            //payrollDays == 0
            //    ? 0
            //    : paidDays / payrollDays;

            //        decimal basic =
            //            Math.Round((monthlyCTC * 0.3817m) * ratio);

            //        decimal hra =
            //            Math.Round((basic * 0.40m));

            //        decimal conveyance =
            //            Math.Round(1600 * ratio);

            //        decimal medical =
            //            Math.Round(1250 * ratio);

            //        decimal pf =
            //            Math.Round(basic * 0.12m);

            //        decimal gross =
            //            (monthlyCTC * ratio) - pf;

            //        decimal specialAllowance =
            // Math.Floor(
            //     gross -
            //     (basic + hra + conveyance + medical));

            //        decimal totalEarnings =
            //            Math.Floor(
            //                basic +
            //                hra +
            //                conveyance +
            //                medical +
            //                specialAllowance);

            //        //--------------------------------
            //        // TDS
            //        //--------------------------------
            //        decimal tdsAmount = 0m;

            //        if (TDSPercentage > 0)
            //        {
            //            tdsAmount = Math.Round(
            //                totalEarnings * TDSPercentage / 100m,
            //                2,
            //                MidpointRounding.AwayFromZero);
            //        }

            //        decimal professionalTax = 200m;

            //        decimal totalDeductions =
            // Math.Round(
            //     pf +
            //     professionalTax +
            //     tdsAmount +
            //     OtherDeductions,
            //     2,
            //     MidpointRounding.AwayFromZero);

            //        decimal netSalary =
            // Math.Round(
            //     totalEarnings - totalDeductions,
            //     2,
            //     MidpointRounding.AwayFromZero);

            //        if (netSalary < 0)
            //            netSalary = 0;

            //        if (netSalary < 0)
            //            netSalary = 0;
            //        string netSalaryWords =
            //            "Rupees " +
            //            NumberToWords((long)netSalary) +
            //            " Only";


            //--------------------------------
            // SALARY CALCULATIONS
            //--------------------------------
            //--------------------------------
            // SALARY STRUCTURE
            //--------------------------------

            var salaryStructure = await _context.EmployeeSalaryStructures
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == employeeId &&
                    x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

            if (salaryStructure == null)
            {
                throw new Exception(
                    $"Salary structure not found for employee {employeeId}.");
            }


            //--------------------------------
            // ATTENDANCE RATIO
            //--------------------------------

            decimal ratio =
                payrollDays == 0
                    ? 0
                    : paidDays / payrollDays;


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
            decimal basic = RoundSalary(fullBasic * ratio);

            decimal hra = RoundSalary(fullHRA * ratio);

            decimal conveyance = RoundSalary(fullConveyance * ratio);

            decimal medical = RoundSalary(fullMedical * ratio);

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
            {
                lopDeduction = 0;
            }


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
    RoundSalary(salaryStructure.ProfessionalTax);

decimal tdsAmount =
    RoundSalary(salaryStructure.TDS);

            //--------------------------------
            // OTHER DEDUCTIONS
            //--------------------------------

            decimal totalOtherDeduction =
      RoundSalary(
          salaryStructure.OtherDeduction +
          OtherDeductions);


            //--------------------------------
            // TOTAL DEDUCTIONS
            //--------------------------------

            decimal totalDeductions =
      RoundSalary(
          pf +
          professionalTax +
          tdsAmount +
          totalOtherDeduction);


            //--------------------------------
            // NET SALARY
            //--------------------------------

            decimal netSalary =
     RoundSalary(
         totalEarnings - totalDeductions);

            if (netSalary < 0)
            {
                netSalary = 0;
            }


            //--------------------------------
            // NET SALARY IN WORDS
            //--------------------------------

            string netSalaryWords =
                "Rupees " +
                NumberToWords((long)netSalary) +
                " Only";


            //        //--------------------------------
            // TEMPLATE
            //--------------------------------
            var templatePath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "Templates",
                "PaySlipTemplate.docx");

            if (!File.Exists(templatePath))
                throw new Exception(
                    $"Template not found: {templatePath}");


            ////    vishnu    //--------------------------------

            //// --------------------------------

            //// GET PAYSLIP TEMPLATE

            //// --------------------------------

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

            //


            var outputFolder = Path.Combine(
                Directory.GetCurrentDirectory(),
                "GeneratedPayslips");
            
            if (!Directory.Exists(outputFolder))
                Directory.CreateDirectory(outputFolder);

            var employeeNameForFile = personalInfo == null
     ? employee.Name
     : $"{personalInfo.FirstName} {personalInfo.LastName}".Trim();

            if (string.IsNullOrWhiteSpace(employeeNameForFile))
            {
                employeeNameForFile = employee.Employee_Id;
            }

            // Remove characters that are not allowed in Windows/Linux filenames
            foreach (char c in Path.GetInvalidFileNameChars())
            {
                employeeNameForFile = employeeNameForFile.Replace(c, '_');
            }

            // Replace spaces with underscores
            employeeNameForFile = employeeNameForFile.Replace(" ", "_");

            var fileName =
                $"{employeeNameForFile}_{employee.Employee_Id}_{month}_{year}.docx";

            var outputPath =
                Path.Combine(outputFolder, fileName);

            File.Copy(templatePath, outputPath, true);
            DeductionLabel = string.IsNullOrWhiteSpace(DeductionLabel)
    ? "Other Deductions"
    : DeductionLabel;
            //--------------------------------
            // REPLACE BOOKMARKS
            //--------------------------------
            using (WordprocessingDocument wordDoc =
                WordprocessingDocument.Open(outputPath, true))
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
    "DeductionType",
    DeductionLabel);
                ReplaceBookmark(
     wordDoc,
     "OtherDeduction",
     totalOtherDeduction.ToString("N2"));

                ReplaceBookmark(
                    wordDoc,
                    "TotalDeduction",
                    totalDeductions.ToString("N2"));
                ReplaceBookmark(
    wordDoc,
    "TDS",
    tdsAmount.ToString("N2"));

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

                ReplaceBookmark(
    wordDoc,
    "Month",
    $"{month.ToUpper()} {year}");

                ReplaceBookmark(
                    wordDoc,
                    "PayPeriod",
                    $"{month.ToUpper()} {year}");

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
    "LOPDeduction",
    lopDeduction.ToString("N2"));

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


            // ==========================================
            // UNIQUE LIBREOFFICE PROFILE
            // ==========================================

            var libreOfficeProfile =
                Path.Combine(
                    Path.GetTempPath(),
                    $"LibreOffice_{Guid.NewGuid():N}");

            Directory.CreateDirectory(
                libreOfficeProfile);

            var profileUri =
                new Uri(libreOfficeProfile)
                    .AbsoluteUri;


            try
            {
                using var process =
                    new Process();

                process.StartInfo.FileName =
                    sofficePath;

                process.StartInfo.Arguments =
                    $"-env:UserInstallation={profileUri} " +
                    $"--headless " +
                    $"--convert-to pdf " +
                    $"\"{outputPath}\" " +
                    $"--outdir \"{outputFolder}\"";

                process.StartInfo.CreateNoWindow =
                    true;

                process.StartInfo.UseShellExecute =
                    false;

                process.StartInfo.RedirectStandardOutput =
                    true;

                process.StartInfo.RedirectStandardError =
                    true;


                process.Start();

                await process.WaitForExitAsync();


                if (process.ExitCode != 0)
                {
                    string error =
                        await process.StandardError
                            .ReadToEndAsync();

                    throw new Exception(
                        $"PDF generation failed. {error}");
                }


                if (!File.Exists(pdfPath))
                {
                    string error =
                        await process.StandardError
                            .ReadToEndAsync();

                    throw new Exception(
                        $"PDF file was not generated. {error}");
                }
            }
            finally
            {
                // ==========================================
                // DELETE TEMP LIBREOFFICE PROFILE
                // ==========================================

                try
                {
                    if (Directory.Exists(
                        libreOfficeProfile))
                    {
                        Directory.Delete(
                            libreOfficeProfile,
                            true);
                    }
                }
                catch
                {
                    // Ignore cleanup error
                }
            }

            //--------------------------------
            // SAVE DB
            //--------------------------------
            var payslip = new PaySlip
            {
                EmployeeId = employee.Employee_Id,
                Month = month,
                Year = year,
                CTC = salaryStructure.AnnualCTC,
                GrossSalary = gross,
                NetSalary = netSalary,
                TotalDeductions = totalDeductions,
                OtherDeductions = totalOtherDeduction,
                FilePath = pdfPath,
                Generated_On = GetIndianTime()
            };

            _context.PaySlips.Add(payslip);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Another Hangfire worker may have inserted
                // the same Employee + Month + Year.

                bool duplicateExists = await _context.PaySlips
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.EmployeeId == employeeId &&
                        x.Year == yearValue &&
                        x.Month == month);

                if (duplicateExists)
                {
                    Console.WriteLine(
                        $"Duplicate payslip prevented: " +
                        $"{employeeId} - {month} {yearValue}");

                    return string.Empty;
                }

                throw;
            }

            var employeeName = personalInfo == null

                 ? employee.Name

                 : $"{personalInfo.FirstName} {personalInfo.LastName}".Trim();

            // Notification Settings Check

            //var notification = await _context.NotificationSettings

            //     .AsNoTracking()

            //     .FirstOrDefaultAsync();

            //if (notification != null &&

            //     notification.EnableEmailNotifications &&

            //     notification.EnablePayslipEmails)

            //{

            //    await _emailService.SendPayslipEmail(

            //        employee.Email,

            //        employeeName,

            //        month,

            //        year,

            //        pdfPath);

            //}

            //

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
        [DisableConcurrentExecution(timeoutInSeconds: 3600)]
        public async Task<List<BulkPayslipGenerationResultDto>> GenerateAllPaySlips(
       int year,
       List<string> months,
       List<string> employeeIds)
        {
            // ============================================================
            // 1. VALIDATE INPUT
            // ============================================================

            if (months == null || months.Count == 0)
            {
                throw new Exception("At least one month is required.");
            }

            if (employeeIds == null || employeeIds.Count == 0)
            {
                throw new Exception("At least one employee is required.");
            }

            // ============================================================
            // 2. NORMALIZE MONTHS
            // ============================================================

            var validMonths = new List<string>();

            foreach (var requestedMonth in months)
            {
                if (string.IsNullOrWhiteSpace(requestedMonth))
                    continue;

                var monthText = requestedMonth.Trim();

                if (!DateTime.TryParseExact(
                        monthText,
                        "MMMM",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateTime parsedMonth))
                {
                    throw new Exception(
                        $"Invalid month format: {requestedMonth}");
                }

                var normalizedMonth = parsedMonth.ToString(
                    "MMMM",
                    CultureInfo.InvariantCulture);

                if (!validMonths.Any(x =>
                        x.Equals(
                            normalizedMonth,
                            StringComparison.OrdinalIgnoreCase)))
                {
                    validMonths.Add(normalizedMonth);
                }
            }

            if (validMonths.Count == 0)
            {
                throw new Exception("No valid months were provided.");
            }

            // ============================================================
            // 3. REMOVE DUPLICATE EMPLOYEE IDS
            // ============================================================

            var requestedEmployeeIds = employeeIds
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (requestedEmployeeIds.Count == 0)
            {
                throw new Exception(
                    "No valid employee IDs were provided.");
            }

            // ============================================================
            // 4. FINAL RESULTS
            // ============================================================

            var allResults =
                new List<BulkPayslipGenerationResultDto>();

            // ============================================================
            // 5. PROCESS EACH MONTH
            // ============================================================

            foreach (var month in validMonths)
            {
                Console.WriteLine(
                    "==========================================");

                Console.WriteLine(
                    $"PAYSLIP GENERATION STARTED");

                Console.WriteLine(
                    $"Month     : {month}");

                Console.WriteLine(
                    $"Year      : {year}");

                Console.WriteLine(
                    $"Employees : {requestedEmployeeIds.Count}");

                Console.WriteLine(
                    "==========================================");

                // ========================================================
                // 6. FIND EXISTING PAYSLIPS - ONE DB QUERY
                // ========================================================

                var alreadyGenerated =
                    await _context.PaySlips
                        .AsNoTracking()
                        .Where(p =>
                            p.Year == year &&
                            p.Month == month &&
                            requestedEmployeeIds.Contains(
                                p.EmployeeId))
                        .Select(p => p.EmployeeId)
                        .ToListAsync();

                var existingEmployeeIds =
                    alreadyGenerated
                        .Where(id =>
                            !string.IsNullOrWhiteSpace(id))
                        .ToHashSet(
                            StringComparer.OrdinalIgnoreCase);

                // ========================================================
                // 7. FIND EMPLOYEES THAT NEED GENERATION
                // ========================================================

                var employeesToGenerate =
                    requestedEmployeeIds
                        .Where(id =>
                            !existingEmployeeIds.Contains(id))
                        .ToList();

                // ========================================================
                // 8. CREATE MONTH RESULT
                // ========================================================

                var result =
                    new BulkPayslipGenerationResultDto
                    {
                        TotalRequested =
                            requestedEmployeeIds.Count,

                        GeneratedEmployees =
                            new List<string>(),

                        SkippedEmployees =
                            requestedEmployeeIds
                                .Where(id =>
                                    existingEmployeeIds.Contains(id))
                                .ToList(),

                        FailedEmployees =
                            new List<string>()
                    };

                result.SkippedCount =
                    result.SkippedEmployees.Count;

                // ========================================================
                // 9. IF EVERYTHING ALREADY EXISTS
                // ========================================================

                if (employeesToGenerate.Count == 0)
                {
                    Console.WriteLine(
                        $"No new payslips required for " +
                        $"{month} {year}");

                    Console.WriteLine(
                        $"Skipped : {result.SkippedCount}");

                    allResults.Add(result);

                    continue;
                }

                // ========================================================
                // 10. PRELOAD EMPLOYEES
                // ========================================================

                var employees =
                    await _context.Employees
                        .AsNoTracking()
                        .Include(e => e.BankDetails)
                        .Where(e =>
                            employeesToGenerate.Contains(
                                e.Employee_Id))
                        .ToListAsync();

                var employeeDictionary =
                    employees.ToDictionary(
                        e => e.Employee_Id,
                        StringComparer.OrdinalIgnoreCase);

                // ========================================================
                // 11. CHECK EMPLOYEES NOT FOUND
                // ========================================================

                foreach (var employeeId in employeesToGenerate)
                {
                    if (!employeeDictionary.ContainsKey(employeeId))
                    {
                        result.FailedEmployees.Add(
                            $"{employeeId} => Employee not found");
                    }
                }

                // ========================================================
                // 12. THREAD-SAFE COLLECTIONS
                // ========================================================

                var generatedEmployees =
                    new ConcurrentBag<string>();

                var skippedEmployees =
                    new ConcurrentBag<string>();

                var failedEmployees =
                    new ConcurrentBag<string>();

                // ========================================================
                // 13. PARALLEL SETTINGS
                // ========================================================

                var parallelOptions =
                    new ParallelOptions
                    {
                        MaxDegreeOfParallelism = 4
                    };

                // ========================================================
                // 14. GENERATE PAYSLIPS
                // ========================================================

                await Parallel.ForEachAsync(
                    employeesToGenerate,
                    parallelOptions,
                    async (employeeId, cancellationToken) =>
                    {
                        // Employee does not exist
                        if (!employeeDictionary.ContainsKey(employeeId))
                        {
                            return;
                        }

                        try
                        {
                            Console.WriteLine(
                                $"START: {employeeId} - " +
                                $"{month} {year}");

                            // IMPORTANT:
                            // Separate scope / DbContext
                            using var scope =
                                _scopeFactory.CreateScope();

                            var paySlipService =
                                scope.ServiceProvider
                                    .GetRequiredService<IPaySlipService>();

                            // =================================================
                            // GENERATE
                            // =================================================

                            var filePath =
                                await paySlipService.GeneratePaySlip(
                                    employeeId,
                                    year,
                                    month,
                                    0,
                                    "Other Deductions",
                                    0,
                                    false);

                            // =================================================
                            // SUCCESS
                            // =================================================

                            if (!string.IsNullOrWhiteSpace(filePath))
                            {
                                generatedEmployees.Add(employeeId);

                                Console.WriteLine(
                                    $"SUCCESS: {employeeId}");
                            }
                            else
                            {
                                skippedEmployees.Add(employeeId);

                                Console.WriteLine(
                                    $"SKIPPED: {employeeId}");
                            }
                        }
                        catch (DbUpdateException ex)
                        {
                            // =================================================
                            // DATABASE DUPLICATE / INSERT ERROR
                            // =================================================

                            Console.WriteLine(
                                $"DB ERROR: {employeeId}");

                            Console.WriteLine(
                                ex.ToString());

                            // Check whether another worker/job
                            // already inserted the payslip.
                            try
                            {
                                using var checkScope =
                                    _scopeFactory.CreateScope();

                                var checkContext =
                                    checkScope.ServiceProvider
                                        .GetRequiredService<AppDbContext>();

                                bool alreadyExists =
                                    await checkContext.PaySlips
                                        .AsNoTracking()
                                        .AnyAsync(
                                            p =>
                                                p.EmployeeId ==
                                                    employeeId &&
                                                p.Year == year &&
                                                p.Month == month,
                                            cancellationToken);

                                if (alreadyExists)
                                {
                                    skippedEmployees.Add(
                                        employeeId);

                                    Console.WriteLine(
                                        $"DUPLICATE PREVENTED: " +
                                        $"{employeeId}");
                                }
                                else
                                {
                                    failedEmployees.Add(
                                        $"{employeeId} => " +
                                        $"{ex.InnerException?.Message ??
                                          ex.Message}");
                                }
                            }
                            catch (Exception checkEx)
                            {
                                failedEmployees.Add(
                                    $"{employeeId} => " +
                                    $"{checkEx.Message}");
                            }
                        }
                        catch (Exception ex)
                        {
                            // =================================================
                            // GENERAL ERROR
                            // =================================================

                            failedEmployees.Add(
                                $"{employeeId} => {ex.Message}");

                            Console.WriteLine(
                                $"FAILED: {employeeId}");

                            Console.WriteLine(
                                ex.ToString());
                        }
                    });

                // ========================================================
                // 15. MERGE RESULTS
                // ========================================================

                result.GeneratedEmployees =
                    generatedEmployees
                        .Distinct(
                            StringComparer.OrdinalIgnoreCase)
                        .ToList();

                result.SkippedEmployees =
                    result.SkippedEmployees
                        .Concat(
                            skippedEmployees)
                        .Distinct(
                            StringComparer.OrdinalIgnoreCase)
                        .ToList();

                result.FailedEmployees =
                    result.FailedEmployees
                        .Concat(
                            failedEmployees)
                        .Distinct(
                            StringComparer.OrdinalIgnoreCase)
                        .ToList();

                // ========================================================
                // 16. COUNTS
                // ========================================================

                result.GeneratedCount =
                    result.GeneratedEmployees.Count;

                result.SkippedCount =
                    result.SkippedEmployees.Count;

                result.FailedCount =
                    result.FailedEmployees.Count;

                // ========================================================
                // 17. LOG SUMMARY
                // ========================================================

                Console.WriteLine(
                    "==========================================");

                Console.WriteLine(
                    $"PAYSLIP SUMMARY - {month} {year}");

                Console.WriteLine(
                    $"Requested : {result.TotalRequested}");

                Console.WriteLine(
                    $"Generated : {result.GeneratedCount}");

                Console.WriteLine(
                    $"Skipped   : {result.SkippedCount}");

                Console.WriteLine(
                    $"Failed    : {result.FailedCount}");

                Console.WriteLine(
                    "==========================================");

                allResults.Add(result);
            }

            // ============================================================
            // 18. FINAL SUMMARY
            // ============================================================

            Console.WriteLine(
                "==========================================");

            Console.WriteLine(
                "MULTI-MONTH PAYSLIP GENERATION COMPLETED");

            Console.WriteLine(
                $"Months             : {validMonths.Count}");

            Console.WriteLine(
                $"Total Generated    : " +
                $"{allResults.Sum(x => x.GeneratedCount)}");

            Console.WriteLine(
                $"Total Skipped      : " +
                $"{allResults.Sum(x => x.SkippedCount)}");

            Console.WriteLine(
                $"Total Failed       : " +
                $"{allResults.Sum(x => x.FailedCount)}");

            Console.WriteLine(
                "==========================================");

            return allResults;
        }   //--------------------------------
        // GET RECENT
        //--------------------------------
        public async Task<List<PaySlip>> GetRecentPayslips()
        {
            return await _context.PaySlips
                .AsNoTracking()
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

        //--------------------------------
        // NUMBER TO WORDS
        //--------------------------------
        private static readonly TimeZoneInfo IndiaTimeZone =
    TimeZoneInfo.FindSystemTimeZoneById(
        RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? "India Standard Time"
            : "Asia/Kolkata");

        private static DateTime GetIndianTime()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                IndiaTimeZone);
        }
        private static decimal RoundSalary(decimal amount)
        {
            return Math.Round(
                amount,
                0,
                MidpointRounding.AwayFromZero);
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

        public async Task<List<object>> GetEmployeePayslips(string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            var payslips = await _context.PaySlips
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.Year)
                .ThenByDescending(p => p.Generated_On)
                .Select(p => new
                {
                    p.Id,
                    p.EmployeeId,
                    EmployeeName = employee.Name,
                    p.Month,
                    p.Year,
                    p.CTC,
                    p.GrossSalary,
                    p.TotalDeductions,
                    p.NetSalary,
                    p.Generated_On,
                    PreviewUrl = $"/api/PaySlip/preview/{p.Id}",
                    DownloadUrl = $"/api/PaySlip/download/{p.Id}"
                })
                .ToListAsync();

            return payslips.Cast<object>().ToList();
        }

        public async Task<bool> DeletePaySlip(int id)
        {
            var payslip = await _context.PaySlips
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payslip == null)
                throw new Exception("Payslip not found.");

            // Delete PDF file
            if (!string.IsNullOrWhiteSpace(payslip.FilePath))
            {
                var fileName = Path.GetFileName(payslip.FilePath);

                var filePath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "GeneratedPayslips",
                    fileName);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }

            _context.PaySlips.Remove(payslip);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<BulkPayslipEmailResultDto> SendBulkPayslipEmails(
    int year,
    string month)
        {
            //------------------------------------------------
            // VALIDATE MONTH
            //------------------------------------------------

            if (string.IsNullOrWhiteSpace(month))
                throw new ArgumentException("Month is required.");

            month = month.Trim();

            //------------------------------------------------
            // GET GENERATED PAYSLIPS
            //------------------------------------------------

            var payslips = await _context.PaySlips
                .AsNoTracking()
                .Where(p =>
                    p.Year == year &&
                    p.Month.ToLower() == month.ToLower())
                .Select(p => new
                {
                    p.Id,
                    p.EmployeeId,
                    p.FilePath
                })
                .ToListAsync();

            if (payslips.Count == 0)
            {
                return new BulkPayslipEmailResultDto
                {
                    TotalPayslips = 0,
                    SentCount = 0,
                    FailedCount = 0
                };
            }


            //------------------------------------------------
            // RESULT COUNTERS
            //------------------------------------------------

            int sentCount = 0;
            int failedCount = 0;

            var failedEmployees =
                new ConcurrentBag<string>();


            //------------------------------------------------
            // PARALLEL EMAIL SENDING
            //------------------------------------------------

            var parallelOptions =
                new ParallelOptions
                {
                    // Start with 4.
                    // Increase only if your SMTP provider allows it.
                    MaxDegreeOfParallelism = 4
                };


            await Parallel.ForEachAsync(
                payslips,
                parallelOptions,
                async (payslip, cancellationToken) =>
                {
                    try
                    {
                        //------------------------------------------------
                        // CREATE SEPARATE SCOPE
                        //------------------------------------------------

                        using var scope =
                            _scopeFactory.CreateScope();


                        var context =
                            scope.ServiceProvider
                                .GetRequiredService<AppDbContext>();


                        var emailService =
                            scope.ServiceProvider
                                .GetRequiredService<IEmailService>();


                        //------------------------------------------------
                        // GET EMPLOYEE
                        //------------------------------------------------

                        var employee =
                            await context.Employees
                                .AsNoTracking()
                                .FirstOrDefaultAsync(
                                    e =>
                                        e.Employee_Id ==
                                        payslip.EmployeeId,
                                    cancellationToken);


                        if (employee == null)
                        {
                            Interlocked.Increment(
                                ref failedCount);

                            failedEmployees.Add(
                                $"{payslip.EmployeeId} - Employee not found");

                            return;
                        }


                        //------------------------------------------------
                        // VALIDATE EMAIL
                        //------------------------------------------------

                        if (string.IsNullOrWhiteSpace(
                            employee.Email))
                        {
                            Interlocked.Increment(
                                ref failedCount);

                            failedEmployees.Add(
                                $"{payslip.EmployeeId} - Email not found");

                            return;
                        }


                        //------------------------------------------------
                        // VALIDATE PDF
                        //------------------------------------------------

                        if (string.IsNullOrWhiteSpace(
                            payslip.FilePath))
                        {
                            Interlocked.Increment(
                                ref failedCount);

                            failedEmployees.Add(
                                $"{payslip.EmployeeId} - PDF path not found");

                            return;
                        }


                        if (!File.Exists(
                            payslip.FilePath))
                        {
                            Interlocked.Increment(
                                ref failedCount);

                            failedEmployees.Add(
                                $"{payslip.EmployeeId} - PDF file not found");

                            return;
                        }


                        //------------------------------------------------
                        // EMPLOYEE NAME
                        //------------------------------------------------

                        string employeeName =
                            !string.IsNullOrWhiteSpace(employee.Name)
                                ? employee.Name
                                : employee.Employee_Id;


                        //------------------------------------------------
                        // SEND EMAIL
                        //------------------------------------------------

                        await emailService.SendPayslipEmail(
                            employee.Email,
                            employeeName,
                            month,
                            year,
                            payslip.FilePath);


                        //------------------------------------------------
                        // SUCCESS
                        //------------------------------------------------

                        Interlocked.Increment(
                            ref sentCount);

                        Console.WriteLine(
                            $"Payslip email sent: " +
                            $"{payslip.EmployeeId}");
                    }
                    catch (Exception ex)
                    {
                        //------------------------------------------------
                        // FAILED
                        //------------------------------------------------

                        Interlocked.Increment(
                            ref failedCount);

                        failedEmployees.Add(
                            $"{payslip.EmployeeId} => {ex.Message}");

                        Console.WriteLine(
                            $"Payslip email failed: " +
                            $"{payslip.EmployeeId}");

                        Console.WriteLine(
                            ex.ToString());
                    }
                });


            //------------------------------------------------
            // RETURN RESULT
            //------------------------------------------------

            return new BulkPayslipEmailResultDto
            {
                TotalPayslips = payslips.Count,

                SentCount = sentCount,

                FailedCount = failedCount,

                FailedEmployees =
                    failedEmployees.ToList()
            };
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
                var salaryStructure =
                    await _context.EmployeeSalaryStructures
                        .AsNoTracking()
                        .Where(x =>
                            x.Employee_Id == pay.EmployeeId &&
                            x.IsActive)
                        .OrderByDescending(x => x.EffectiveFrom)
                        .FirstOrDefaultAsync();

                if (salaryStructure == null)
                    continue;

                totalPf += salaryStructure.EmployeePF;
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
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e =>
                        e.Employee_Id == pay.EmployeeId);

                var salaryStructure =
                    await _context.EmployeeSalaryStructures
                        .AsNoTracking()
                        .Where(x =>
                            x.Employee_Id == pay.EmployeeId &&
                            x.IsActive)
                        .OrderByDescending(x => x.EffectiveFrom)
                        .FirstOrDefaultAsync();

                if (salaryStructure == null)
                    continue;

                decimal basic =
                    salaryStructure.BasicSalary;

                decimal pf =
                    salaryStructure.EmployeePF;

                pfSheet.Cell(pfRow, 1).Value =
                    pay.EmployeeId;

                pfSheet.Cell(pfRow, 2).Value =
                    employee?.Name ?? "";

                pfSheet.Cell(pfRow, 3).Value =
                    employee?.Department ?? "";

                pfSheet.Cell(pfRow, 4).Value =
                    salaryStructure.AnnualCTC;

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