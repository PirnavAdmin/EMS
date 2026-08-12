using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using Microsoft.EntityFrameworkCore;
using iText.IO.Font.Constants;
using iText.Kernel.Font;

namespace EmployeeManagementSystem.Services
{
    public class Form16Service : IForm16Service
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public Form16Service(AppDbContext context,
                             IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        public async Task<string> GenerateForm16Async(string employeeId, string financialYear)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found.");

            var tds = await _context.EmployeeTDS
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == employeeId &&
                    x.FinancialYear == financialYear);

            if (tds == null)
                throw new Exception("TDS not found.");

            var folder = Path.Combine(_environment.WebRootPath, "Form16");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string fileName = $"{employeeId}_{financialYear}_Form16.pdf";
            string fullPath = Path.Combine(folder, fileName);

            using (var writer = new PdfWriter(fullPath))
            {
                var pdf = new PdfDocument(writer);
                var document = new Document(pdf);

                PdfFont boldFont = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);

                document.Add(
                    new Paragraph("FORM 16")
                        .SetFont(boldFont)
                        .SetFontSize(20)
                );

                document.Add(new Paragraph($"Employee ID : {employee.Employee_Id}"));
                document.Add(new Paragraph($"Financial Year : {financialYear}"));
                document.Add(new Paragraph($"Gross Salary : {tds.GrossSalary}"));
                document.Add(new Paragraph($"Taxable Income : {tds.TaxableIncome}"));
                document.Add(new Paragraph($"Total Tax : {tds.TotalTax}"));
                document.Add(new Paragraph($"Monthly TDS : {tds.MonthlyTDS}"));

                document.Add(new Paragraph(""));
                document.Add(new Paragraph("This certificate is issued under Section 203 of the Income Tax Act."));

                document.Add(new Paragraph(""));
                document.Add(new Paragraph("Authorized Signatory"));
                document.Add(new Paragraph("HR Department"));

                document.Close();
            }

            return "/Form16/" + fileName;
        }
    }
}