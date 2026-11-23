using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Attendance controller with complete Audit Logging
    //[Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service
        private readonly AppDbContext _context; // varsha - DB context for capturing pre-update attendance state

        public AttendanceController(
            IAttendanceService attendanceService,
            IAuditLogService auditLogService,
            AppDbContext context) // varsha
        {
            _attendanceService = attendanceService;
            _auditLogService = auditLogService; // varsha
            _context = context; // varsha
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
        [Authorize]
        [HttpPost("checkin")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInLocationDto dto)
        {
            var result = await _attendanceService.CheckIn(User, dto);

            // varsha - Audit successful attendance check-in
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                var empId = User.FindFirst("EmployeeId")?.Value;
                await _auditLogService.LogCreateAsync(
                    module: "Attendance",
                    entityName: "Attendance",
                    entityId: empId ?? "Unknown",
                    description: $"Employee {empId} checked in at {DateTime.UtcNow:HH:mm:ss} UTC",
                    newValues: dto,
                    user: User);
            }

            return result;
        }

        // ✅ Check-Out
        [Authorize]
        [HttpPost("checkout")]
        public async Task<IActionResult> CheckOut([FromBody] CheckOutLocationDto dto)
        {
            var result = await _attendanceService.CheckOut(User, dto);

            // varsha - Audit successful attendance check-out
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                var empId = User.FindFirst("EmployeeId")?.Value;
                await _auditLogService.LogUpdateAsync(
                    module: "Attendance",
                    entityName: "Attendance",
                    entityId: empId ?? "Unknown",
                    description: $"Employee {empId} checked out at {DateTime.UtcNow:HH:mm:ss} UTC",
                    newValues: dto,
                    user: User);
            }

            return result;
        }
        //---------------------------------------

        // 👨‍💻 EMPLOYEE ATTENDANCE VIEW

        //---------------------------------------

        // ✅ Weekly
        //[Permission(ModuleIds.UserAttendance, PermissionAction.View)]
        
        [HttpGet("weekly")]

        public async Task<IActionResult> GetWeekly()

        {

            return await _attendanceService.GetWeeklyAttendance(User);

        }

        // ✅ Previous Week

        
        //[Permission(ModuleIds.UserAttendance, PermissionAction.View)]
        [HttpGet("previous-week")]

        public async Task<IActionResult> GetPreviousWeek()

        {

            return await _attendanceService.GetPreviousWeekAttendance(User);

        }

        // ✅ Current Month (Running Month)
        //[Permission(ModuleIds.UserAttendance, PermissionAction.View)]
      
        [HttpGet("current-month")]

        public async Task<IActionResult> GetCurrentMonth()

        {

            return await _attendanceService.GetCurrentMonthAttendance(User);

        }

        // ✅ Previous Month
        //[Permission(ModuleIds.UserAttendance, PermissionAction.View)]
        [HttpGet("previous-month")]
        

        public async Task<IActionResult> GetPreviousMonth()

        {

            return await _attendanceService.GetPreviousMonthAttendance(User);

        }

        // ✅ Custom Month View
        [HttpGet("monthly-summary/{employeeId}")]
        public async Task<IActionResult> GetMonthlySummary(
    string employeeId,
    [FromQuery] int month,
    [FromQuery] int year)
        {
            try
            {
                var summary = await _attendanceService.GetMonthlyAttendanceSummary(
                    employeeId,
                    month,
                    year);

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Message = ex.Message
                });
            }
        }

        //[Permission(ModuleIds.UserAttendance, PermissionAction.View)]
        
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
        [HttpGet("admin-dashboard-overview")]
        public async Task<IActionResult> GetAdminDashboardOverview()
        {
            return Ok(await _attendanceService.GetAdminDashboardOverview());
        }

        // ✅ Monthly / Year View

        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthlyAttendance(
     [FromQuery] int month,
     [FromQuery] int year)
        {
            if (month < 1 || month > 12)
                return BadRequest("Month must be between 1 and 12.");

            if (year < 2000 || year > 2100)
                return BadRequest("Invalid year.");

            var result = await _attendanceService
                .GetAllEmployeeAttendance(month, year);

            return Ok(result);
        }


        [Authorize]
        [HttpPost("admin/update-attendance")]
        public async Task<IActionResult> AdminUpdateAttendance(
            string employeeId,
            DateTime date,
            DateTime? checkIn,
            DateTime? checkOut)
        {
            // varsha - Capture existing attendance record before admin correction
            var existingAtt = await _context.Attendance.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Employee_Id == employeeId && a.Attendance_Date.Date == date.Date);

            var oldValues = existingAtt != null ? new
            {
                existingAtt.Employee_Id,
                Date = existingAtt.Attendance_Date.ToString("yyyy-MM-dd"),
                existingAtt.Check_In,
                existingAtt.Check_Out,
                existingAtt.Status,
                existingAtt.WorkingMinutes
            } : null;

            var result = await _attendanceService.AdminUpdateAttendance(
                User,
                employeeId,
                date,
                checkIn,
                checkOut);

            // varsha - Audit attendance correction with actual old and new values
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                var newValues = new
                {
                    EmployeeId = employeeId,
                    Date = date.ToString("yyyy-MM-dd"),
                    CheckIn = checkIn,
                    CheckOut = checkOut
                };

                await _auditLogService.LogUpdateAsync(
                    module: "Attendance",
                    entityName: "Attendance",
                    entityId: employeeId,
                    description: $"Admin updated/corrected attendance for employee {employeeId} for date {date:yyyy-MM-dd}",
                    oldValues: oldValues,
                    newValues: newValues,
                    user: User);
            }

            return result;
        }

        //---------------------------------------

        // 📊 DASHBOARD APIs

        //---------------------------------------

        // ✅ Today Stats

        // ✅ Today

        //[Authorize(Roles = "Admin")]

        [HttpGet("stats/today")]

        public async Task<IActionResult> GetTodayStats()

        {

            var result = await _attendanceService.GetTodayStats();

            return Ok(result);

        }

        // ✅ Yearly Summary

        //[Authorize(Roles = "Admin")]

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

        [HttpGet("GetLocations")]
        public async Task<IActionResult> GetLocations()
        {
            return await _attendanceService.GetLocations();
        }
        [HttpPost("SaveLocation")]
        public async Task<IActionResult> SaveLocation(EmployeeLocationDto dto)
        {
            return await _attendanceService.SaveLocation(dto);
        }

        [HttpGet("dashboard-attendance")]
        public async Task<IActionResult> GetDashboardAttendance()
        {
            try
            {
                var result = await _attendanceService.GetDashboardAttendance(User);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Message = ex.ToString(),
                    Inner = ex.InnerException?.ToString()
                });
            }
        }

        //[Authorize]
        [HttpPost("update-activity")]
        public async Task<IActionResult> UpdateActivity()
        {
            return await _attendanceService
                .UpdateActivity(User);
        }

        [HttpPost("admin/upload-monthly")]
        public async Task<IActionResult> UploadAttendance(
    IFormFile file,
    int month,
    int year)
        {
            var result = await _attendanceService.UploadMonthlyAttendance(
                User,
                file,
                month,
                year);

            return Ok(result);
        }



    }



    }




