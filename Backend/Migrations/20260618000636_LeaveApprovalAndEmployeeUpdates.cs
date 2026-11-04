using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmployeeManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class LeaveApprovalAndEmployeeUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Month",
                table: "payslips",
                type: "varchar(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "EmployeeId",
                table: "payslips",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "employeeleave",
                type: "varchar(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Employee_Id",
                table: "employeeleave",
                type: "varchar(255)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "employeeleave",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedOn",
                table: "employeeleave",
                type: "datetime(6)",
                nullable: true);

           

            migrationBuilder.AlterColumn<string>(
                name: "Employee_Id",
                table: "attendance",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AutoCheckoutReason",
                table: "attendance",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "CheckInLatitude",
                table: "attendance",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CheckInLongitude",
                table: "attendance",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CheckOutLatitude",
                table: "attendance",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CheckOutLongitude",
                table: "attendance",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckoutType",
                table: "attendance",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "DistanceMeters",
                table: "attendance",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsLocationMismatch",
                table: "attendance",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastActivityTime",
                table: "attendance",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationChangeReason",
                table: "attendance",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "LocationStatus",
                table: "attendance",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "TotalBreakMinutes",
                table: "attendance",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "BreakLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AttendanceId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BreakStart = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    BreakEnd = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    BreakMinutes = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BreakLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BreakLogs_attendance_AttendanceId",
                        column: x => x.AttendanceId,
                        principalTable: "attendance",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "EmployeeDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Employee_Id = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Document_Type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    File_Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    File_Path = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    File_Size_MB = table.Column<decimal>(type: "decimal(65,30)", nullable: false),
                    Verification_Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Remarks = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Uploaded_Date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Verified_By = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Verified_Date = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmployeeDocuments", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_payslips_EmployeeId",
                table: "payslips",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_payslips_Month_Year",
                table: "payslips",
                columns: new[] { "Month", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_holidays_Holiday_Date",
                table: "holidays",
                column: "Holiday_Date");

            migrationBuilder.CreateIndex(
                name: "IX_employeeleave_Employee_Id_Status_From_Date_To_Date",
                table: "employeeleave",
                columns: new[] { "Employee_Id", "Status", "From_Date", "To_Date" });

            migrationBuilder.CreateIndex(
                name: "IX_attendance_Attendance_Date",
                table: "attendance",
                column: "Attendance_Date");

            migrationBuilder.CreateIndex(
                name: "IX_attendance_Employee_Id_Attendance_Date",
                table: "attendance",
                columns: new[] { "Employee_Id", "Attendance_Date" });

            migrationBuilder.CreateIndex(
                name: "IX_activitylogs_CreatedAt",
                table: "activitylogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BreakLogs_AttendanceId",
                table: "BreakLogs",
                column: "AttendanceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BreakLogs");

            migrationBuilder.DropTable(
                name: "EmployeeDocuments");

            migrationBuilder.DropIndex(
                name: "IX_payslips_EmployeeId",
                table: "payslips");

            migrationBuilder.DropIndex(
                name: "IX_payslips_Month_Year",
                table: "payslips");

            migrationBuilder.DropIndex(
                name: "IX_holidays_Holiday_Date",
                table: "holidays");

            migrationBuilder.DropIndex(
                name: "IX_employeeleave_Employee_Id_Status_From_Date_To_Date",
                table: "employeeleave");

            migrationBuilder.DropIndex(
                name: "IX_attendance_Attendance_Date",
                table: "attendance");

            migrationBuilder.DropIndex(
                name: "IX_attendance_Employee_Id_Attendance_Date",
                table: "attendance");

            migrationBuilder.DropIndex(
                name: "IX_activitylogs_CreatedAt",
                table: "activitylogs");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "employeeleave");

            migrationBuilder.DropColumn(
                name: "ApprovedOn",
                table: "employeeleave");

            migrationBuilder.DropColumn(
                name: "HRStatus",
                table: "employeeleave");

            migrationBuilder.DropColumn(
                name: "ManagerStatus",
                table: "employeeleave");

            migrationBuilder.DropColumn(
                name: "AutoCheckoutReason",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "CheckInLatitude",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "CheckInLongitude",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "CheckOutLatitude",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "CheckOutLongitude",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "CheckoutType",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "DistanceMeters",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "IsLocationMismatch",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "LastActivityTime",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "LocationChangeReason",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "LocationStatus",
                table: "attendance");

            migrationBuilder.DropColumn(
                name: "TotalBreakMinutes",
                table: "attendance");

            migrationBuilder.AlterColumn<string>(
                name: "Month",
                table: "payslips",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "EmployeeId",
                table: "payslips",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "employeeleave",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Employee_Id",
                table: "employeeleave",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(255)",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Employee_Id",
                table: "attendance",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
