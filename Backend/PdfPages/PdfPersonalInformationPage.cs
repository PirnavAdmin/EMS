using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.PdfPages
{
    public static class PdfPersonalInformationPage
    {
        public static void Draw(
            IDocumentContainer document,
            EmployeeProfilePdfDto profile)
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
                            profile.Employee.Name,
                            profile.Employee.Employee_Id,
                            "PERSONAL INFORMATION");
                    });

                page.Content()
    .Padding(10)
    .Element(container =>
    {
        PdfSectionHelper.DrawSection(
            container,
            "PERSONAL INFORMATION",
            section =>
            {
                DrawTable(section, profile);
            });
    });

                page.Footer()
                    .Height(25)
                    .Element(PdfFooter.DrawFooter);
            });
        }

        private static void DrawTable(
    IContainer container,
    EmployeeProfilePdfDto profile)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(150);
                    columns.RelativeColumn();

                    columns.ConstantColumn(150);
                    columns.RelativeColumn();
                });

                PdfTableHelper.AddRow(
                    table,
                    "Employee ID",
                    profile.Employee.Employee_Id,

                    "Gender",
                    profile.PersonalInfo.Gender);

                PdfTableHelper.AddRow(
                    table,
                    "Employee Name",
                    profile.Employee.Name,

                    "Blood Group",
                    profile.PersonalInfo.BloodGroup);

                PdfTableHelper.AddRow(
                    table,
                    "Date Of Birth",
                    profile.PersonalInfo.DateOfBirth.ToString("dd MMM yyyy"),

                    "Marital Status",
                    profile.PersonalInfo.Marital_Status);

                PdfTableHelper.AddRow(
                    table,
                    "Department",
                    profile.PersonalInfo.Department,

                    "Designation",
                    profile.PersonalInfo.Designation);

                PdfTableHelper.AddRow(
                    table,
                    "Phone Number",
                    profile.PersonalInfo.PhoneNumber,

                    "Email",
                    profile.PersonalInfo.Email);

                PdfTableHelper.AddRow(
                    table,
                    "Aadhaar Number",
                    profile.PersonalInfo.AadhaarNumber,

                    "PAN Number",
                    profile.PersonalInfo.PanNumber);

                PdfTableHelper.AddRow(
                    table,
                    "Work Experience",
                    profile.PersonalInfo.WorkExperience,

                    "Joining Date",
                    profile.PersonalInfo.JoiningDate?.ToString("dd MMM yyyy"));
            });
        }
    }
}