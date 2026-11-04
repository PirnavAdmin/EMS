using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class FullFinalSettlementService
        : IFullFinalSettlementService
    {
        private readonly AppDbContext _context;

        public FullFinalSettlementService(
            AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GENERATE FULL & FINAL SETTLEMENT
        // =========================================================

        public async Task<bool> GenerateSettlement(
            GenerateSettlementDto dto)
        {
            try
            {
                if (dto == null ||
                    string.IsNullOrWhiteSpace(dto.Employee_Id))
                {
                    return false;
                }

                // -------------------------------------------------
                // 1. CHECK EMPLOYEE
                // -------------------------------------------------

                var employee =
                    await _context.Employees
                        .FirstOrDefaultAsync(x =>
                            x.Employee_Id == dto.Employee_Id);

                if (employee == null)
                {
                    return false;
                }

                // -------------------------------------------------
                // 2. CHECK APPROVED RESIGNATION
                // -------------------------------------------------

                var resignation =
                    await _context.EmployeeResignations
                        .Where(x =>
                            x.Employee_Id == dto.Employee_Id &&
                            x.OverallStatus == "Approved")
                        .OrderByDescending(x =>
                            x.ResignationId)
                        .FirstOrDefaultAsync();

                if (resignation == null)
                {
                    return false;
                }

                // -------------------------------------------------
                // 3. CHECK COMPLETED CLEARANCE
                // -------------------------------------------------

                var clearance =
                    await _context.EmployeeClearances
                        .FirstOrDefaultAsync(x =>
                            x.ResignationId ==
                            resignation.ResignationId &&
                            x.CompletedDate != null);

                if (clearance == null)
                {
                    return false;
                }

                // -------------------------------------------------
                // 4. CHECK EXIT INTERVIEW
                // -------------------------------------------------

                var exitInterview =
                    await _context.ExitInterviews
                        .FirstOrDefaultAsync(x =>
                            x.ResignationId ==
                            resignation.ResignationId);

                if (exitInterview == null)
                {
                    return false;
                }

                // -------------------------------------------------
                // 5. CHECK DUPLICATE SETTLEMENT
                // -------------------------------------------------

                var existingSettlement =
                    await _context.FullFinalSettlements
                        .FirstOrDefaultAsync(x =>
                            x.Employee_Id ==
                            dto.Employee_Id);

                if (existingSettlement != null)
                {
                    return false;
                }

                // -------------------------------------------------
                // 6. GET LATEST SALARY STRUCTURE
                // -------------------------------------------------

                var salaryStructure =
                    await _context.EmployeeSalaryStructures
                        .Where(x =>
                            x.Employee_Id ==
                            dto.Employee_Id &&
                            x.IsActive)
                        .OrderByDescending(x =>
                            x.EffectiveFrom)
                        .ThenByDescending(x =>
                            x.Id)
                        .FirstOrDefaultAsync();

                // -------------------------------------------------
                // 7. GET LATEST PAYSLIP
                // -------------------------------------------------

                var latestPayslip =
                    await _context.PaySlips
                        .Where(x =>
                            x.EmployeeId ==
                            dto.Employee_Id)
                        .OrderByDescending(x =>
                            x.Year)
                        .ThenByDescending(x =>
                            x.Id)
                        .FirstOrDefaultAsync();

                // -------------------------------------------------
                // 8. CALCULATE GROSS SALARY
                // -------------------------------------------------

                decimal grossSalary = 0;

                if (latestPayslip != null &&
                    latestPayslip.GrossSalary.HasValue &&
                    latestPayslip.GrossSalary.Value > 0)
                {
                    grossSalary =
                        latestPayslip.GrossSalary.Value;
                }
                else if (salaryStructure != null)
                {
                    grossSalary =
                        salaryStructure.MonthlyCTC;
                }

                // -------------------------------------------------
                // 9. GET REMAINING LEAVES
                // -------------------------------------------------

                decimal remainingLeaves = 0;

                var leaveBalances =
                    await _context.EmployeeMonthlyLeaveBalance
                        .Where(x =>
                            x.Employee_Id ==
                            dto.Employee_Id)
                        .ToListAsync();

                if (leaveBalances.Any())
                {
                    remainingLeaves =
                        leaveBalances.Sum(x =>
                            x.RemainingLeaves);
                }

                // -------------------------------------------------
                // 10. LEAVE ENCASHMENT
                // -------------------------------------------------

                decimal leaveEncashment = 0;

                if (salaryStructure != null &&
                    salaryStructure.BasicSalary > 0)
                {
                    decimal dailyBasicSalary =
                        salaryStructure.BasicSalary / 26;

                    leaveEncashment =
                        remainingLeaves *
                        dailyBasicSalary;
                }

                // -------------------------------------------------
                // 11. BONUS
                // -------------------------------------------------

                // No bonus source/rule currently exists
                // in the EMS F&F calculation.
                decimal bonus = 0;

                // -------------------------------------------------
                // 12. DEDUCTIONS
                // -------------------------------------------------

                decimal deductions = 0;

                if (salaryStructure != null)
                {
                    deductions =
                        salaryStructure.EmployeePF +
                        salaryStructure.ProfessionalTax +
                        salaryStructure.TDS +
                        salaryStructure.OtherDeduction;
                }
                else if (latestPayslip != null &&
                         latestPayslip.TotalDeductions.HasValue)
                {
                    deductions =
                        latestPayslip.TotalDeductions.Value;
                }

                // -------------------------------------------------
                // 13. NET SETTLEMENT
                // -------------------------------------------------

                decimal netSettlement =
                    grossSalary +
                    leaveEncashment +
                    bonus -
                    deductions;

                if (netSettlement < 0)
                {
                    netSettlement = 0;
                }

                // -------------------------------------------------
                // 14. CREATE SETTLEMENT
                // -------------------------------------------------

                var settlement =
                    new FullFinalSettlement
                    {
                        Employee_Id =
                            dto.Employee_Id,

                        GrossSalary =
                            grossSalary,

                        LeaveEncashment =
                            leaveEncashment,

                        Bonus =
                            bonus,

                        Deductions =
                            deductions,

                        NetSettlement =
                            netSettlement,

                        GeneratedDate =
                            DateTime.Now,

                        Status =
                            "Pending"
                    };

                _context.FullFinalSettlements.Add(
                    settlement);

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"GenerateSettlement Error: {ex}");

                return false;
            }
        }

        // =========================================================
        // APPROVE / REJECT SETTLEMENT
        // =========================================================

        public async Task<bool> ApproveSettlement(
            ApproveSettlementDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return false;
                }

                var settlement =
                    await _context.FullFinalSettlements
                        .FirstOrDefaultAsync(x =>
                            x.SettlementId ==
                            dto.SettlementId);

                if (settlement == null)
                {
                    return false;
                }

                // First action wins
                if (!string.Equals(
                        settlement.Status,
                        "Pending",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                settlement.Status =
                    dto.IsApproved
                        ? "Approved"
                        : "Rejected";

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"ApproveSettlement Error: {ex}");

                return false;
            }
        }

        // =========================================================
        // GET ALL SETTLEMENTS
        // =========================================================

        public async Task<List<SettlementResponseDto>>
            GetAll()
        {
            try
            {
                return await _context.FullFinalSettlements
                    .AsNoTracking()
                    .OrderByDescending(x =>
                        x.SettlementId)
                    .Select(x =>
                        new SettlementResponseDto
                        {
                            SettlementId =
                                x.SettlementId,

                            Employee_Id =
                                x.Employee_Id,

                            GrossSalary =
                                x.GrossSalary,

                            LeaveEncashment =
                                x.LeaveEncashment,

                            Bonus =
                                x.Bonus,

                            Deductions =
                                x.Deductions,

                            NetSettlement =
                                x.NetSettlement,

                            GeneratedDate =
                                x.GeneratedDate,

                            Status =
                                x.Status
                        })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"GetAll Settlement Error: {ex}");

                return new List<SettlementResponseDto>();
            }
        }

        // =========================================================
        // GET EMPLOYEE SETTLEMENT
        // =========================================================

        public async Task<SettlementResponseDto?>
            GetEmployeeSettlement(
                string employeeId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(employeeId))
                {
                    return null;
                }

                return await _context.FullFinalSettlements
                    .AsNoTracking()
                    .Where(x =>
                        x.Employee_Id ==
                        employeeId)
                    .OrderByDescending(x =>
                        x.SettlementId)
                    .Select(x =>
                        new SettlementResponseDto
                        {
                            SettlementId =
                                x.SettlementId,

                            Employee_Id =
                                x.Employee_Id,

                            GrossSalary =
                                x.GrossSalary,

                            LeaveEncashment =
                                x.LeaveEncashment,

                            Bonus =
                                x.Bonus,

                            Deductions =
                                x.Deductions,

                            NetSettlement =
                                x.NetSettlement,

                            GeneratedDate =
                                x.GeneratedDate,

                            Status =
                                x.Status
                        })
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"GetEmployeeSettlement Error: {ex}");

                return null;
            }
        }

        // =========================================================
        // DELETE SETTLEMENT
        // =========================================================

        public async Task<bool> DeleteSettlement(
            int settlementId)
        {
            try
            {
                var settlement =
                    await _context.FullFinalSettlements
                        .FirstOrDefaultAsync(x =>
                            x.SettlementId ==
                            settlementId);

                if (settlement == null)
                {
                    return false;
                }

                // Approved settlement cannot be deleted
                if (string.Equals(
                        settlement.Status,
                        "Approved",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                _context.FullFinalSettlements.Remove(
                    settlement);

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"DeleteSettlement Error: {ex}");

                return false;
            }
        }

        // =========================================================
        // GENERATE SETTLEMENT PDF
        // =========================================================

        public async Task<byte[]?>
            GenerateSettlementPdf(
                int settlementId)
        {
            try
            {
                // -------------------------------------------------
                // 1. GET SETTLEMENT
                // -------------------------------------------------

                var settlement =
                    await _context.FullFinalSettlements
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.SettlementId ==
                            settlementId);

                if (settlement == null)
                {
                    return null;
                }

                // -------------------------------------------------
                // 2. PDF ONLY FOR APPROVED SETTLEMENT
                // -------------------------------------------------

                if (!string.Equals(
                        settlement.Status,
                        "Approved",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return null;
                }

                // -------------------------------------------------
                // 3. GET EMPLOYEE
                // -------------------------------------------------

                var employee =
                    await _context.Employees
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.Employee_Id ==
                            settlement.Employee_Id);

                if (employee == null)
                {
                    return null;
                }

                // -------------------------------------------------
                // 4. GET APPROVED RESIGNATION
                // -------------------------------------------------

                var resignation =
                    await _context.EmployeeResignations
                        .AsNoTracking()
                        .Where(x =>
                            x.Employee_Id ==
                            settlement.Employee_Id &&
                            x.OverallStatus ==
                            "Approved")
                        .OrderByDescending(x =>
                            x.ResignationId)
                        .FirstOrDefaultAsync();

                // -------------------------------------------------
                // 5. CREATE PDF MEMORY STREAM
                // -------------------------------------------------

                using var memoryStream =
                    new MemoryStream();

                using var writer =
                    new PdfWriter(memoryStream);

                using var pdf =
                    new PdfDocument(writer);

                using var document =
                    new Document(pdf);

                // -------------------------------------------------
                // 6. CREATE FONTS
                // -------------------------------------------------

                PdfFont normalFont =
                    PdfFontFactory.CreateFont(
                        StandardFonts.HELVETICA);

                PdfFont boldFont =
                    PdfFontFactory.CreateFont(
                        StandardFonts.HELVETICA_BOLD);

                // =================================================
                // TITLE
                // =================================================

                var title =
                    new Paragraph(
                        "FULL & FINAL SETTLEMENT")
                    .SetFont(boldFont)
                    .SetFontSize(20)
                    .SetTextAlignment(
                        TextAlignment.CENTER);

                document.Add(title);

                var subtitle =
                    new Paragraph(
                        "Employee Settlement Statement")
                    .SetFont(normalFont)
                    .SetFontSize(11)
                    .SetTextAlignment(
                        TextAlignment.CENTER);

                document.Add(subtitle);

                document.Add(
                    new Paragraph("\n"));

                // =================================================
                // EMPLOYEE DETAILS
                // =================================================

                var employeeHeading =
                    new Paragraph(
                        "Employee Details")
                    .SetFont(boldFont)
                    .SetFontSize(14);

                document.Add(employeeHeading);

                document.Add(
                    new Paragraph("\n"));

                var employeeTable =
                    new Table(2)
                        .UseAllAvailableWidth();

                AddRow(
                    employeeTable,
                    "Employee ID",
                    employee.Employee_Id,
                    normalFont,
                    boldFont);

                AddRow(
                    employeeTable,
                    "Employee Name",
                    employee.Name ?? "-",
                    normalFont,
                    boldFont);

                AddRow(
                    employeeTable,
                    "Email",
                    employee.Email ?? "-",
                    normalFont,
                    boldFont);

                AddRow(
                    employeeTable,
                    "Resignation Date",
                    resignation != null
                        ? resignation.ResignationDate
                            .ToString("dd-MM-yyyy")
                        : "-",
                    normalFont,
                    boldFont);

                AddRow(
                    employeeTable,
                    "Last Working Date",
                    resignation != null
                        ? resignation.LastWorkingDate
                            .ToString("dd-MM-yyyy")
                        : "-",
                    normalFont,
                    boldFont);

                document.Add(employeeTable);

                document.Add(
                    new Paragraph("\n"));

                // =================================================
                // SETTLEMENT DETAILS
                // =================================================

                var settlementHeading =
                    new Paragraph(
                        "Settlement Details")
                    .SetFont(boldFont)
                    .SetFontSize(14);

                document.Add(settlementHeading);

                document.Add(
                    new Paragraph("\n"));

                var settlementTable =
                    new Table(2)
                        .UseAllAvailableWidth();

                AddRow(
                    settlementTable,
                    "Gross Salary",
                    FormatAmount(
                        settlement.GrossSalary),
                    normalFont,
                    boldFont);

                AddRow(
                    settlementTable,
                    "Leave Encashment",
                    FormatAmount(
                        settlement.LeaveEncashment),
                    normalFont,
                    boldFont);

                AddRow(
                    settlementTable,
                    "Bonus",
                    FormatAmount(
                        settlement.Bonus),
                    normalFont,
                    boldFont);

                AddRow(
                    settlementTable,
                    "Deductions",
                    FormatAmount(
                        settlement.Deductions),
                    normalFont,
                    boldFont);

                AddRow(
                    settlementTable,
                    "Net Settlement",
                    FormatAmount(
                        settlement.NetSettlement),
                    normalFont,
                    boldFont,
                    true);

                document.Add(settlementTable);

                document.Add(
                    new Paragraph("\n"));

                // =================================================
                // STATUS
                // =================================================

                var statusHeading =
                    new Paragraph(
                        "Settlement Status")
                    .SetFont(boldFont)
                    .SetFontSize(14);

                document.Add(statusHeading);

                document.Add(
                    new Paragraph("\n"));

                var statusTable =
                    new Table(2)
                        .UseAllAvailableWidth();

                AddRow(
                    statusTable,
                    "Generated Date",
                    settlement.GeneratedDate
                        .ToString("dd-MM-yyyy HH:mm"),
                    normalFont,
                    boldFont);

                AddRow(
                    statusTable,
                    "Status",
                    settlement.Status,
                    normalFont,
                    boldFont);

                document.Add(statusTable);

                document.Add(
                    new Paragraph("\n\n"));

                // =================================================
                // FOOTER
                // =================================================

                var footer =
                    new Paragraph(
                        "This is a computer-generated Full & Final Settlement statement.")
                    .SetFont(normalFont)
                    .SetFontSize(9)
                    .SetTextAlignment(
                        TextAlignment.CENTER);

                document.Add(footer);

                var company =
                    new Paragraph(
                        "Employee Management System")
                    .SetFont(normalFont)
                    .SetFontSize(9)
                    .SetTextAlignment(
                        TextAlignment.CENTER);

                document.Add(company);

                // -------------------------------------------------
                // CLOSE DOCUMENT
                // -------------------------------------------------

                document.Close();

                return memoryStream.ToArray();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Generate settlement PDF failed: {ex}");

                return null;
            }
        }

        // =========================================================
        // PDF TABLE ROW HELPER
        // =========================================================

        private static void AddRow(
            Table table,
            string label,
            string value,
            PdfFont normalFont,
            PdfFont boldFont,
            bool highlight = false)
        {
            var labelParagraph =
                new Paragraph(label)
                    .SetFont(boldFont);

            var valueParagraph =
                new Paragraph(value)
                    .SetFont(
                        highlight
                            ? boldFont
                            : normalFont);

            var labelCell =
                new Cell()
                    .Add(labelParagraph);

            var valueCell =
                new Cell()
                    .Add(valueParagraph);

            table.AddCell(labelCell);
            table.AddCell(valueCell);
        }

        // =========================================================
        // FORMAT MONEY
        // =========================================================

        private static string FormatAmount(
            decimal amount)
        {
            return $"₹ {amount:N2}";
        }
    }
}