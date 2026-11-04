using EmployeeManagementSystem.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmployeeManagementSystem.Documents
{
    public class PaySlipPdfDocument : IDocument
    {
        private readonly PaySlipPdfDto _data;

        public PaySlipPdfDocument(PaySlipPdfDto data)
        {
            _data = data;
        }

        public DocumentMetadata GetMetadata()
        {
            return DocumentMetadata.Default;
        }

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);

                page.Margin(30);

                page.DefaultTextStyle(x =>
                    x.FontSize(10));

                page.Header()
                    .Element(ComposeHeader);

                page.Content()
                    .PaddingVertical(10)
                    .Element(ComposeContent);

                page.Footer()
                    .AlignCenter()
                    .Text("This is a system generated payslip.")
                    .FontSize(8);
            });
        }


        private void ComposeHeader(
            IContainer container)
        {
            container.Column(column =>
            {
                column.Spacing(5);

                column.Item()
                    .AlignCenter()
                    .Text("PIRNAV SOFTWARE SOLUTIONS")
                    .Bold()
                    .FontSize(18);

                column.Item()
                    .AlignCenter()
                    .Text(
                        $"PAYSLIP - {_data.Month.ToUpper()} {_data.Year}")
                    .Bold()
                    .FontSize(14);
            });
        }


        private void ComposeContent(
            IContainer container)
        {
            container.Column(column =>
            {
                column.Spacing(12);

                column.Item()
                    .Element(ComposeEmployeeDetails);

                column.Item()
                    .Element(ComposeAttendance);

                column.Item()
                    .Element(ComposeSalary);

                column.Item()
                    .Element(ComposeNetSalary);
            });
        }
        private void ComposeEmployeeDetails(
    IContainer container)
        {
            container
                .Border(1)
                .Padding(10)
                .Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                    });

                    AddDetail(
                        table,
                        "Employee ID",
                        _data.EmployeeId);

                    AddDetail(
                        table,
                        "Employee Name",
                        _data.EmployeeName);

                    AddDetail(
                        table,
                        "Designation",
                        _data.Designation);

                    AddDetail(
                        table,
                        "Department",
                        _data.Department);

                    AddDetail(
                        table,
                        "Bank",
                        _data.BankName);

                    AddDetail(
                        table,
                        "Account Number",
                        _data.AccountNumber);

                    AddDetail(
                        table,
                        "PAN",
                        _data.PanNumber);
                });
        }


        private static void AddDetail(
            TableDescriptor table,
            string label,
            string value)
        {
            table.Cell()
                .Padding(4)
                .Text(label)
                .SemiBold();

            table.Cell()
                .Padding(4)
                .Text(value ?? "");
        }
        private void ComposeAttendance(
    IContainer container)
        {
            container
                .Border(1)
                .Padding(10)
                .Column(column =>
                {
                    column.Item()
                        .Text("Attendance Summary")
                        .Bold()
                        .FontSize(12);

                    column.Item()
                        .PaddingTop(5)
                        .Text(
                            $"Payroll Days: {_data.PayrollDays}");

                    column.Item()
                        .Text(
                            $"Present Days: {_data.PresentDays}");

                    column.Item()
                        .Text(
                            $"Paid Leave Days: {_data.PaidLeaveDays}");

                    column.Item()
                        .Text(
                            $"LOP Days: {_data.LopDays}");

                    column.Item()
                        .Text(
                            $"Payable Days: {_data.PayableDays}");
                });
        }
        private void ComposeSalary(
    IContainer container)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn();

                    columns.RelativeColumn(2);
                    columns.RelativeColumn();
                });


                table.Header(header =>
                {
                    header.Cell()
                        .Border(1)
                        .Padding(5)
                        .Text("Earnings")
                        .Bold();

                    header.Cell()
                        .Border(1)
                        .Padding(5)
                        .Text("Amount")
                        .Bold();

                    header.Cell()
                        .Border(1)
                        .Padding(5)
                        .Text("Deductions")
                        .Bold();

                    header.Cell()
                        .Border(1)
                        .Padding(5)
                        .Text("Amount")
                        .Bold();
                });


                AddSalaryRow(
                    table,
                    "Basic",
                    _data.Basic,
                    "PF",
                    _data.PF);

                AddSalaryRow(
                    table,
                    "HRA",
                    _data.HRA,
                    "Professional Tax",
                    _data.ProfessionalTax);

                AddSalaryRow(
                    table,
                    "Conveyance",
                    _data.Conveyance,
                    "LOP Deduction",
                    _data.LopDeduction);

                AddSalaryRow(
                    table,
                    "Medical Allowance",
                    _data.MedicalAllowance,
                    "Other Deduction",
                    _data.OtherDeduction);

                AddSalaryRow(
                    table,
                    "Special Allowance",
                    _data.SpecialAllowance,
                    "Total Deductions",
                    _data.TotalDeductions);
            });
        }


        private static void AddSalaryRow(
            TableDescriptor table,
            string earning,
            decimal earningAmount,
            string deduction,
            decimal deductionAmount)
        {
            table.Cell()
                .Border(1)
                .Padding(5)
                .Text(earning);

            table.Cell()
                .Border(1)
                .Padding(5)
                .AlignRight()
                .Text(earningAmount.ToString("N2"));

            table.Cell()
                .Border(1)
                .Padding(5)
                .Text(deduction);

            table.Cell()
                .Border(1)
                .Padding(5)
                .AlignRight()
                .Text(deductionAmount.ToString("N2"));
        }
        private void ComposeNetSalary(
    IContainer container)
        {
            container
                .Border(1)
                .Padding(10)
                .Row(row =>
                {
                    row.RelativeItem()
                        .Text("NET SALARY")
                        .Bold()
                        .FontSize(13);

                    row.RelativeItem()
                        .AlignRight()
                        .Text($"₹ {_data.NetSalary:N2}")
                        .Bold()
                        .FontSize(13);
                });
        }
    }
}