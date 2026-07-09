using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Helpers
{
    public static class PdfSectionHelper
    {
        public static void DrawSection(
            IContainer container,
            string title,
            Action<IContainer> content)
        {
            container
                .Border(1)
                .BorderColor(Colors.Grey.Lighten2)
                .Column(column =>
                {
                    // Blue Heading
                    column.Item()
                        .Background("#0B5394")
                        .Padding(10)
                        .AlignCenter()
                        .Text(title)
                        .FontSize(16)
                        .Bold()
                        .FontColor(Colors.White);

                    // White Content Area
                    column.Item()
                        .Padding(15)
                        .Element(content);
                });
        }
    }
}