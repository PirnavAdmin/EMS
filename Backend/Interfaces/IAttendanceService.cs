using Microsoft.AspNetCore.Mvc;

using EmployeeManagementSystem.DTOs;

using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAttendanceService

    {

        //---------------------------------------

        // EMPLOYEE ACTIONS

        //---------------------------------------

        Task<IActionResult> CheckIn(
              ClaimsPrincipal user,
              CheckInLocationDto dto);

        Task<IActionResult> CheckOut(
            ClaimsPrincipal user,
            CheckOutLocationDto dto);
        //---------------------------------------

        // USER ATTENDANCE VIEWS

        //---------------------------------------

        Task<IActionResult> GetWeeklyAttendance(ClaimsPrincipal user);

        Task<IActionResult> GetPreviousWeekAttendance(ClaimsPrincipal user);

        Task<IActionResult> GetCurrentMonthAttendance(ClaimsPrincipal user);

        Task<IActionResult> GetPreviousMonthAttendance(ClaimsPrincipal user);

        Task<IActionResult> GetMonthAttendance(ClaimsPrincipal user, int month, int year);

        //---------------------------------------

        // ADMIN ATTENDANCE (DAILY + MONTHLY)

        //---------------------------------------

        Task<List<object>> GetAttendanceByDate(
      DateTime date,
      string status = "All",
      string search = "");

        Task<List<AdminEmployeeAttendanceDto>> GetAllEmployeeAttendance(int month, int year);

        Task<IActionResult> AdminUpdateAttendance(string employeeId, DateTime date, DateTime? checkIn, DateTime? checkOut);

        Task<AttendanceSummaryDto> GetMonthlyAttendanceSummary(string employeeId, int month, int year);

        //---------------------------------------

        // NOTIFICATIONS / BACKGROUND JOBS

        //---------------------------------------

        Task CheckMissedCheckIns();

        Task CheckMissingCheckouts();

        //---------------------------------------

        // OPTIONAL (GOOD FOR DASHBOARD)

        //---------------------------------------

        Task<object> GetTodayStats();        // present, late, absent counts

        Task<object> GetYearlySummary(int year); // yearly report

        Task<IActionResult> GetEmployeeWorkingHours(
      string employeeId,
      DateOnly fromDate,
      DateOnly toDate);


        Task<byte[]> ExportMonthlyAttendance(int month, int year);
        Task<string> UploadMonthlyAttendance(IFormFile file, int month, int year);
        Task<byte[]> ExportWeeklyAttendance(DateTime weekStartDate);
        Task<byte[]> ExportDailyAttendance(DateTime date);

        Task<byte[]> ExportAbsentEmployees(DateTime date);

        Task<byte[]> ExportPresentAndLateEmployees(DateTime date);

        Task<IActionResult> UpdateActivity(
    ClaimsPrincipal user);
        



    }
}
