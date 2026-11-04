using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Helpers
{
    public static class PdfFooter
    {
        public static void DrawFooter(IContainer container)
        {
            container
                .BorderTop(1)
                .BorderColor(Colors.Grey.Lighten2)
                .PaddingTop(5)
                .Row(row =>
                {
                    row.RelativeItem()
                        .Text("Employee Management System")
                        .FontSize(9);

                    row.ConstantItem(120)
                        .AlignRight()
                        .Text(text =>
                        {
                            text.DefaultTextStyle(x => x.FontSize(9));

                            text.Span("Page ");
                            text.CurrentPageNumber();
                            text.Span(" of ");
                            text.TotalPages();
                        });
                });
        }
    }
}