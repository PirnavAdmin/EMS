using EmployeeManagementSystem.Interfaces;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

namespace EmployeeManagementSystem.Controllers

{

    [Route("api/[controller]")]

    [ApiController]

    public class AttendanceController : ControllerBase

    {

        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)

        {

            _attendanceService = attendanceService;

        }

        //---------------------------------------

        // 🔐 HELPER: ADMIN CHECK

        //---------------------------------------

        private bool IsAdmin()

        {

            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            return role == "Admin";

        }

        //---------------------------------------

        // 👨‍💻 EMPLOYEE APIs

        //---------------------------------------

        // ✅ Check-In

        [HttpPost("check-in")]

        public async Task<IActionResult> CheckIn()

        {

            return await _attendanceService.CheckIn(User);

        }

        // ✅ Check-Out

        [HttpPost("check-out")]

        public async Task<IActionResult> CheckOut()

        {

            return await _attendanceService.CheckOut(User);

        }
        [Authorize]

        [HttpPost("start-break")]
        public async Task<IActionResult> StartBreak()
        {
            return await _attendanceService.StartBreak(User);
        }

        [Authorize]
        [HttpPost("end-break")]
        public async Task<IActionResult> EndBreak()
        {
            return await _attendanceService.EndBreak(User);
        }

        [HttpGet("break-summary")]
        public async Task<IActionResult> GetBreakSummary()
        {
            return await _attendanceService.GetTodayBreakSummary(User);
        }
        //---------------------------------------

        // 👨‍💻 EMPLOYEE ATTENDANCE VIEW

        //---------------------------------------

        // ✅ Weekly

        [HttpGet("weekly")]

        public async Task<IActionResult> GetWeekly()

        {

            return await _attendanceService.GetWeeklyAttendance(User);

        }

        // ✅ Previous Week

        [HttpGet("previous-week")]

        public async Task<IActionResult> GetPreviousWeek()

        {

            return await _attendanceService.GetPreviousWeekAttendance(User);

        }

        // ✅ Current Month (Running Month)

        [HttpGet("current-month")]

        public async Task<IActionResult> GetCurrentMonth()

        {

            return await _attendanceService.GetCurrentMonthAttendance(User);

        }

        // ✅ Previous Month

        [HttpGet("previous-month")]

        public async Task<IActionResult> GetPreviousMonth()

        {

            return await _attendanceService.GetPreviousMonthAttendance(User);

        }

        // ✅ Custom Month View

        [HttpGet("month")]

        public async Task<IActionResult> GetMonth(

    [FromQuery] int month,

    [FromQuery] int year)

        {

            return await _attendanceService.GetMonthAttendance(User, month, year);

        }

        //---------------------------------------

        // 👨‍💼 ADMIN APIs

        //---------------------------------------

        // ✅ Daily Attendance (MAIN UI)



      [HttpGet("today")]
public async Task<IActionResult> GetAttendanceByDate(
    DateTime date,
    string status = "All",
    string search = "")
{
    var result = await _attendanceService
        .GetAttendanceByDate(date, status, search);

    return Ok(result);
}

        // ✅ Monthly / Year View

        [HttpGet("monthly")]

        public async Task<IActionResult> GetMonthlyAttendance(

            [FromQuery] int month,

            [FromQuery] int year)

        {



            var result = await _attendanceService.GetAllEmployeeAttendance(month, year);

            return Ok(result);

        }


        [HttpPost("admin/update-attendance")]

        public async Task<IActionResult> AdminUpdateAttendance(string employeeId, DateTime date, DateTime? checkIn, DateTime? checkOut)

        {

            return await _attendanceService.AdminUpdateAttendance(employeeId, date, checkIn, checkOut);

        }

        //---------------------------------------

        // 📊 DASHBOARD APIs

        //---------------------------------------

        // ✅ Today Stats

        // ✅ Today

        [Authorize(Roles = "Admin")]

        [HttpGet("stats/today")]

        public async Task<IActionResult> GetTodayStats()

        {

            var result = await _attendanceService.GetTodayStats();

            return Ok(result);

        }

        // ✅ Yearly Summary

        [Authorize(Roles = "Admin")]

        [HttpGet("stats/year")]

        public async Task<IActionResult> GetYearlySummary([FromQuery] int year)

        {

            var result = await _attendanceService.GetYearlySummary(year);

            return Ok(result);

        }

        //---------------------------------------

        // 🔔 NOTIFICATION / JOB TRIGGERS

        //---------------------------------------

        // ✅ Run Absent Check

        [HttpPost("run/absent-check")]

        public async Task<IActionResult> RunAbsentCheck()

        {



            return Ok("Absent check executed");

        }

        // ✅ Run Missing Checkout Check

        [HttpPost("run/missing-checkout")]

        public async Task<IActionResult> RunMissingCheckout()

        {



            return Ok("Missing checkout check executed");

        }

        [HttpGet("working-hours/{employeeId}")]

        public async Task<IActionResult> GetEmployeeWorkingHours(

     string employeeId,

     [FromQuery] DateOnly fromDate,

     [FromQuery] DateOnly toDate)

        {

            return await _attendanceService.GetEmployeeWorkingHours(

                employeeId,

                fromDate,

                toDate

            );

        }

        [HttpGet("admin/download-monthly")]

        public async Task<IActionResult> DownloadMonthlyAttendance(int month, int year)

        {

            var fileBytes = await _attendanceService.ExportMonthlyAttendance(month, year);

            return File(

                fileBytes,

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                $"Monthly_Attendance_{new DateTime(year, month, 1):MMMM}_{year}.xlsx"

            );

        }

        [HttpGet("admin/download-weekly")]

        public async Task<IActionResult> DownloadWeeklyAttendance(DateTime weekStartDate)

        {

            var fileBytes = await _attendanceService.ExportWeeklyAttendance(weekStartDate);

            return File(

                fileBytes,

                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                $"Weekly_Attendance_{weekStartDate:dd_MMM_yyyy}.xlsx"

            );

        }


        [HttpGet("admin/download-daily")]
        public async Task<IActionResult> DownloadDaily(DateTime date)
        {
            var file = await _attendanceService.ExportDailyAttendance(date);

            return File(
                file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"daily-attendance-{date:yyyy-MM-dd}.xlsx");
        }
        [HttpGet("export-absent")]
        public async Task<IActionResult> ExportAbsent([FromQuery] DateTime date)
        {
            var file = await _attendanceService.ExportAbsentEmployees(date);

            return File(
                file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"AbsentEmployees_{date:yyyyMMdd}.xlsx");
        }

        [HttpGet("export-present-late")]
        public async Task<IActionResult> ExportPresentLate([FromQuery] DateTime date)
        {
            var file = await _attendanceService.ExportPresentAndLateEmployees(date);

            return File(
                file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"PresentLateEmployees_{date:yyyyMMdd}.xlsx");
        }

    }

}


