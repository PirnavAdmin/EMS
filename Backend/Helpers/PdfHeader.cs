using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Helpers
{
    public static class PdfHeader
    {
        public static void DrawHeader(
            IContainer container,
            string logoPath,
            string companyName,
            string employeeName,
            string employeeId,
            string pageTitle)
        {
            container
                .PaddingBottom(10)
                .BorderBottom(1)
                .BorderColor(Colors.Grey.Lighten2)
                .Row(row =>
                {
                    // Company Logo
                    row.ConstantItem(60)
                        .Height(60)
                        .Image(logoPath);

                    // Company Details
                    row.RelativeItem()
                        .PaddingLeft(10)
                        .Column(column =>
                        {
                            column.Item()
                                .Text(companyName)
                                .FontSize(18)
                                .Bold();

                            column.Item()
                                .Text("Employee Management System")
                                .FontSize(10)
                                .FontColor(Colors.Grey.Darken1);

                            column.Item().PaddingTop(8);

                            column.Item()
                                .Text(pageTitle)
                                .FontSize(16)
                                .Bold()
                                .FontColor("#0B5394");
                        });

                    // Employee Details
                    row.ConstantItem(180)
                        .AlignRight()
                        .Column(column =>
                        {
                            column.Item()
                                .Text($"Employee ID : {employeeId}")
                                .FontSize(10);

                            column.Item()
                                .Text($"Employee Name : {employeeName}")
                                .FontSize(10);
                        });
                });
        }
    }
}