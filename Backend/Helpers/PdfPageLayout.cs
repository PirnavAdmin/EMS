using EmployeeManagementSystem.Models;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Helpers
{
    public static class PdfPageLayout
    {
        public static void CreatePage(
            IDocumentContainer document,
            string title,
            Employee employee,
            Action<IContainer> content)
        {
            document.Page(page =>
            {
                page.Margin(25);

                page.Header()
                    .Element(container =>
                    {
                        PdfHeader.DrawHeader(
                            container,
                            PdfConstants.LogoPath,
                            PdfConstants.CompanyName,
                            employee.Name,
                            employee.Employee_Id,
                            title);
                    });

                page.Content()
                    .PaddingVertical(15)
                    .Element(content);

                page.Footer()
                    .Height(25)
                    .Element(PdfFooter.DrawFooter);
            });
        }
    }
}