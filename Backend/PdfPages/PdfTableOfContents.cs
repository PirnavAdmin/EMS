using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.PdfPages
{
    public static class PdfTableOfContents
    {
        public static void Draw(
            IDocumentContainer document,
            EmployeeProfilePdfDto profile)
        {
            document.Page(page =>
            {
                page.Margin(25);

                // Header
                page.Header()
                    .Element(container =>
                    {
                        PdfHeader.DrawHeader(
                            container,
                            PdfConstants.LogoPath,
                            PdfConstants.CompanyName,
                            profile.Employee.Name,
                            profile.Employee.Employee_Id,
                            "TABLE OF CONTENTS");
                    });

                // Content
                page.Content()
                    .PaddingVertical(20)
                    .Column(column =>
                    {
                        column.Spacing(15);

                        column.Item()
                            .Text("TABLE OF CONTENTS")
                            .FontSize(24)
                            .Bold()
                            .FontColor("#0B5394");

                        column.Item().LineHorizontal(1);

                        AddItem(column, "1", "Personal Information", "3");
                        AddItem(column, "2", "Employment Information", "4");
                        AddItem(column, "3", "Contact Information", "5");
                        AddItem(column, "4", "Address Information", "6");
                        AddItem(column, "5", "Bank Details", "7");
                        AddItem(column, "6", "Education", "8");
                        AddItem(column, "7", "Experience", "9");
                        AddItem(column, "8", "Documents", "10");
                    });

                // Footer
                page.Footer()
                    .Height(25)
                    .Element(PdfFooter.DrawFooter);
            });
        }

        private static void AddItem(
            ColumnDescriptor column,
            string number,
            string title,
            string pageNo)
        {
            column.Item()
                .Row(row =>
                {
                    row.ConstantItem(30)
                        .Text(number + ".");

                    row.RelativeItem()
                        .Text(title);

                    row.ConstantItem(30)
                        .AlignRight()
                        .Text(pageNo);
                });
        }
    }
}