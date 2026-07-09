using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.PdfPages
{
    public static class PdfCoverPage
    {
        public static void Draw(
            IDocumentContainer document,
            EmployeeProfilePdfDto profile)
        {
            document.Page(page =>
            {
                page.Margin(40);

                page.Content().Column(column =>
                {
                    column.Spacing(15);

                    column.Item()
                        .AlignCenter()
                        .Width(100)
                        .Height(100)
                        .Image(PdfConstants.LogoPath);

                    column.Item()
                        .AlignCenter()
                        .Text(PdfConstants.CompanyName)
                        .FontSize(24)
                        .Bold();

                    column.Item()
                        .AlignCenter()
                        .Text(PdfConstants.CompanySubTitle)
                        .FontSize(15)
                        .FontColor(Colors.Grey.Darken2);

                    column.Item()
                        .PaddingVertical(10)
                        .LineHorizontal(1);

                    column.Item()
                        .AlignCenter()
                        .Text("EMPLOYEE PROFILE")
                        .FontSize(28)
                        .Bold()
                        .FontColor("#0B5394");

                    column.Item().PaddingTop(25);

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(180);
                            columns.RelativeColumn();
                        });

                        AddRow(table, "Employee Name",
                            profile.Employee?.Name);

                        AddRow(table, "Employee ID",
                            profile.Employee?.Employee_Id);

                        AddRow(table, "Department",
                            profile.PersonalInfo?.Department);

                        AddRow(table, "Designation",
                            profile.PersonalInfo?.Designation);

                        AddRow(table, "Date of Joining",
                            profile.PersonalInfo?.JoiningDate
                                ?.ToString("dd MMM yyyy"));

                       
                    });
                });
            });
        }

        private static void AddRow(
            TableDescriptor table,
            string label,
            string value)
        {
            table.Cell()
                .Background(Colors.Grey.Lighten3)
                .Border(1)
                .Padding(8)
                .Text(label)
                .Bold();

            table.Cell()
                .Border(1)
                .Padding(8)
                .Text(string.IsNullOrWhiteSpace(value) ? "-" : value);
        }
    }
}