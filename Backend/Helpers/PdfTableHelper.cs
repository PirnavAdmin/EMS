using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Helpers
{
    public static class PdfTableHelper
    {
        public static void AddRow(
            TableDescriptor table,
            string label1,
            string? value1,
            string label2,
            string? value2)
        {
            AddCell(table, label1, true);
            AddCell(table, value1, false);

            AddCell(table, label2, true);
            AddCell(table, value2, false);
        }

        private static void AddCell(
            TableDescriptor table,
            string? value,
            bool isHeader)
        {
            var cell = table.Cell()
                .Border(1)
                .BorderColor(Colors.Grey.Lighten2)
                .PaddingVertical(8)
                .PaddingHorizontal(10);

            if (isHeader)
            {
                cell.Background("#F5F7FA")
                    .Text(value ?? "")
                    .SemiBold()
                    .FontSize(10)
                    .FontColor("#34495E");
            }
            else
            {
                cell.Text(string.IsNullOrWhiteSpace(value) ? "-" : value)
                    .FontSize(10);
            }
        }
    }
}