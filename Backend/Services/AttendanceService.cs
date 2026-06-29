using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Security.Claims;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace EmployeeManagementSystem.Services

{

    public class AttendanceService : IAttendanceService

    {

        private readonly AppDbContext _context;

        private readonly IAdminNotificationService _notificationService;
        private readonly IEmailService _emailService;

        public AttendanceService(
     AppDbContext context,
     IAdminNotificationService notificationService,
     IEmailService emailService)
        {
            _context = context;

            _notificationService = notificationService;

            _emailService = emailService;
        }

        //---------------------------------------

        // HELPERS

        //---------------------------------------

        private DateTime ConvertToIST(DateTime utcTime)

        {

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            return TimeZoneInfo.ConvertTimeFromUtc(utcTime, istZone);

        }

        private string MapStatus(string status)

        {

            return status switch
            {
                "P" => "Present",
                "A" => "Absent",
                "L" => "On Leave",
                "W" => "Weekend",
                "H" => "Holiday",
                "LOP" => "Loss Of Pay",
                "MC" => "Missed Checkout",
                "LMC" => "Late & Missed Checkout",
                _ => status
            };

        }

        private string FormatHours(int minutes)

        {

            var hrs = minutes / 60;

            var mins = minutes % 60;

            return $"{hrs}h {mins}m";

        }



        private async Task<Employee?> GetEmployee(ClaimsPrincipal user)

        {

            var email = user.FindFirst(ClaimTypes.Email)?.Value;

            return await _context.Employees.FirstOrDefaultAsync(e => e.Email == email);

        }

        //---------------------------------------

        // CHECK IN (FIXED ONLY HERE)

        //---------------------------------------
        public async Task<IActionResult> CheckIn(
     ClaimsPrincipal user,
     CheckInLocationDto dto)
        {

            var emp = await GetEmployee(user);

            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;
            var monday = today.AddDays(
    -(int)(today.DayOfWeek == DayOfWeek.Sunday
        ? 6
        : today.DayOfWeek - DayOfWeek.Monday));

            var sunday = monday.AddDays(7);

            var missedCheckoutCount = await _context.Attendance
    .CountAsync(a =>
        a.Employee_Id == emp.Employee_Id &&
        a.Attendance_Date >= monday &&
        a.Attendance_Date < today &&
        a.Check_In != null &&
        a.Check_Out == null);

            var existing = await _context.Attendance
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == emp.Employee_Id &&
                    x.Attendance_Date.Date == today);

            var now = DateTime.UtcNow;
            var ist = ConvertToIST(now);



            var checkInStartTime = new TimeSpan(8, 55, 0);

            if (ist.TimeOfDay < checkInStartTime)
            {
                return new BadRequestObjectResult(
                    "Check-in is allowed only after 08:55 AM");
            }

            string status = "Present";

            // MISSED CHECKOUT POLICY
            if (missedCheckoutCount >= 2)
            {
                status = "LOP";
            }
            else if (ist.TimeOfDay > new TimeSpan(9, 15, 0))
            {
                var lateCount = await _context.Attendance
                    .CountAsync(a =>
                        a.Employee_Id == emp.Employee_Id &&
                        a.Attendance_Date >= monday &&
                        a.Attendance_Date < sunday &&
                        a.Status == "Late");

                if (lateCount >= 2)
                {
                    status = "LOP";
                }
                else
                {
                    status = "Late";
                }
            }
            var employeeName = emp.Name;

            if (string.IsNullOrWhiteSpace(employeeName))
            {
                employeeName = emp.Email ?? "Employee";
            }

            if (existing != null)
            {
                // TEMPORARY FOR GPS TESTING

                existing.Check_In = now;
                existing.Status = status;

                existing.CheckInLatitude = dto.Latitude;
                existing.CheckInLongitude = dto.Longitude;

                existing.LastActivityTime = DateTime.UtcNow;

                _context.ActivityLogs.Add(new ActivityLog
                {
                    Activity = $"{employeeName} checked in (GPS Test)",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();

                return new OkObjectResult(new
                {
                    Message = "Check-in updated successfully",
                    Latitude = existing.CheckInLatitude,
                    Longitude = existing.CheckInLongitude
                });
            }
            _context.Attendance.Add(new Attendance
            {
                Employee_Id = emp.Employee_Id,
                Attendance_Date = today,
                Check_In = now,
                Status = status,
                WorkingMinutes = 0,
                CheckInLatitude = dto.Latitude,
                CheckInLongitude = dto.Longitude,

                LastActivityTime = DateTime.UtcNow
            });

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"{employeeName} checked in",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return new OkObjectResult(new
            {
                Message = "Check-in successful",

                CheckInTime = ConvertToIST(now)
         .ToString("hh:mm:ss tt"),

                Status = status,

                MissedCheckouts = missedCheckoutCount,

                Reminder = missedCheckoutCount > 0
         ? $"You have {missedCheckoutCount} missed checkout(s) this week. On the 3rd missed checkout, LOP will be applied."
         : null
            });

        }

        //---------------------------------------

        // CHECK OUT

        //---------------------------------------

        public async Task<IActionResult> CheckOut(
      ClaimsPrincipal user,
      CheckOutLocationDto dto)

        {

            var emp = await GetEmployee(user);

            if (emp == null) return new UnauthorizedObjectResult("Invalid user");


            var today = DateTime.UtcNow.Date;

            var att = await _context.Attendance

                .FirstOrDefaultAsync(x => x.Employee_Id == emp.Employee_Id && x.Attendance_Date.Date == today);

            if (att == null)

                return new BadRequestObjectResult("Check-in not found");





            var now = DateTime.UtcNow;

            att.Check_Out = now;

            var totalMinutes =
     (int)(now - att.Check_In.Value).TotalMinutes;

            att.WorkingMinutes =
                totalMinutes - att.TotalBreakMinutes;

            var hours = att.WorkingMinutes / 60.0;

            if (hours >= 3 && hours < 4)
                att.Status = "Half Day";
            else if (hours >= 4)
            {
                if (att.Status != "Late" &&
                    att.Status != "LOP" &&
                    att.Status != "Half Day")
                {
                    att.Status = "Present";
                }

            }
            else
                att.Status = "Absent";
            // Store checkout location
            att.CheckOutLatitude = dto.Latitude;
            att.CheckOutLongitude = dto.Longitude;
            if (dto == null)
            {
                return new BadRequestObjectResult("Checkout payload is null");
            }

            if (dto.Latitude == 0 || dto.Longitude == 0)
            {
                return new BadRequestObjectResult("Latitude/Longitude missing");
            }

            // Calculate distance
            if (att.CheckInLatitude.HasValue &&
     att.CheckInLongitude.HasValue)
            {
                var distance = GeoHelper.CalculateDistance(
                    (double)att.CheckInLatitude.Value,
                    (double)att.CheckInLongitude.Value,
                    (double)dto.Latitude,
                    (double)dto.Longitude);

                att.CheckOutLatitude = dto.Latitude;
                att.CheckOutLongitude = dto.Longitude;

                att.DistanceMeters = (decimal)distance;

                if (distance <= 500)
                {
                    att.LocationStatus = "VALID";
                    att.IsLocationMismatch = false;
                    att.LocationChangeReason = null;
                }
                else
                {
                    // Reason mandatory
                    if (string.IsNullOrWhiteSpace(dto.LocationChangeReason))
                    {
                        return new BadRequestObjectResult(new
                        {
                            requiresReason = true,
                            message = "Reason is required when checkout location is more than 500 meters away."
                        });
                    }

                    att.LocationStatus = "MISMATCH";

                    att.IsLocationMismatch = true;

                    att.LocationChangeReason =
                        dto.LocationChangeReason.Trim();
                    // Get HR, HR Admin and Manager email addresses
                    var allowedRoles = new[]
  {
    "HR",
    "HR Admin",
    "Manager"
};

                    var recipients = await (
                        from u in _context.Users
                        join r in _context.Roles
                            on u.RoleId equals r.RoleId
                        where u.Email != null &&
                              allowedRoles.Contains(r.Name)
                        select u.Email
                    ).ToListAsync();
                    // Add additional email addresses
                    recipients.Add("hr.admin@pirnav.com");

                    recipients.Add("hr@pirnav.com");

                    // Remove duplicate email addresses
                    recipients = recipients
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    // Send email to everyone
                    foreach (var email in recipients)
                    {
                        await _emailService.SendLocationMismatchEmail(
                            email,
                            emp.Employee_Id,
                            emp.Name ?? "",
                            emp.Email ?? "",
                            att.CheckInLatitude.Value,
                            att.CheckInLongitude.Value,
                            (decimal)dto.Latitude,
                            (decimal)dto.Longitude,
                            (decimal)distance,
                            dto.LocationChangeReason
                        );
                    }
                }
            }
            att.CheckOutLatitude = dto.Latitude;
            att.CheckOutLongitude = dto.Longitude;


            await _context.SaveChangesAsync();

            return new OkObjectResult(new
            {
                Message = "Check-out successful",

                CheckOutTime = ConvertToIST(att.Check_Out.Value)
          .ToString("hh:mm:ss tt"),

                WorkingHours = FormatHours(att.WorkingMinutes),

                BreakMinutes = att.TotalBreakMinutes,

                Status = att.Status,

            });

        }




        //---------------------------------------

        // ADMIN - TODAY

        //---------------------------------------
        public async Task<IActionResult> UpdateActivity(
    ClaimsPrincipal user)
        {
            var emp = await GetEmployee(user);

            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == emp.Employee_Id &&
                    x.Check_Out == null);

            if (attendance == null)
                return new OkObjectResult("No active attendance");

            attendance.LastActivityTime = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new OkObjectResult("Activity Updated");
        }


        public async Task<List<object>> GetAttendanceByDate(
      DateTime date,
      string status = "All",
      string search = "")
        {
            await CheckMissingCheckouts();

            date = date.Date;

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendanceList = await _context.Attendance
                .AsNoTracking()
                .Where(x => x.Attendance_Date.Date == date)
                .ToListAsync();

            var result = new List<object>();

            foreach (var emp in employees)
            {
                var att = attendanceList
                    .FirstOrDefault(x => x.Employee_Id == emp.Employee_Id);

                string finalStatus = att != null
                    ? MapStatus(att.Status)
                    : "Absent";

                if (!string.Equals(status, "All", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(finalStatus, status, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrWhiteSpace(search))
                {
                    if (!(emp.Name?.Contains(search, StringComparison.OrdinalIgnoreCase) == true ||
                          emp.Employee_Id?.Contains(search, StringComparison.OrdinalIgnoreCase) == true ||
                          emp.Department?.Contains(search, StringComparison.OrdinalIgnoreCase) == true))
                    {
                        continue;
                    }
                }

                result.Add(new

                {

                    emp.Name,

                    emp.Employee_Id,

                    emp.Department,

                    Date = date.ToString("yyyy-MM-dd"),

                    Status = finalStatus,

                    CheckIn = att?.Check_In != null

            ? (DateTime?)ConvertToIST(att.Check_In.Value)

            : null,

                    CheckOut = att?.Check_Out != null

            ? (DateTime?)ConvertToIST(att.Check_Out.Value)

            : null,

                    CheckInLatitude = att?.CheckInLatitude,

                    CheckInLongitude = att?.CheckInLongitude,

                    CheckOutLatitude = att?.CheckOutLatitude,

                    CheckOutLongitude = att?.CheckOutLongitude,

                    CheckInMapUrl =

            att?.CheckInLatitude != null &&

            att?.CheckInLongitude != null

                ? $"https://www.google.com/maps/search/?api=1&query={att.CheckInLatitude},{att.CheckInLongitude}"

                : null,

                    CheckOutMapUrl =

            att?.CheckOutLatitude != null &&

            att?.CheckOutLongitude != null

                ? $"https://www.google.com/maps/search/?api=1&query={att.CheckOutLatitude},{att.CheckOutLongitude}"

                : null,

                    Hours = FormatHours(
    att == null
        ? 0
        : att.Check_In == null
            ? 0
            : att.Check_Out == null
                ? (int)(DateTime.UtcNow - att.Check_In.Value).TotalMinutes
                : att.WorkingMinutes
)

                });

            }

            return result;
        }
        //---------------------------------------

        // ADMIN - MONTHLY

        //---------------------------------------

        public async Task<List<AdminEmployeeAttendanceDto>> GetAllEmployeeAttendance(int month, int year)
        {
            await CheckMissingCheckouts();
            var employees = await _context.Employees
                .AsNoTracking()
                .AsNoTracking().ToListAsync();

            // ✅ Preload data (MAIN OPTIMIZATION)
            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(x => x.Attendance_Date.Month == month && x.Attendance_Date.Year == year)
                .AsNoTracking().ToListAsync();

            var holidays = await _context.Holidays
                .AsNoTracking()
                .Where(h => h.Holiday_Date.Month == month && h.Holiday_Date.Year == year)
                .AsNoTracking().ToListAsync();

            var leaves = await _context.EmployeeLeaves
    .AsNoTracking()
    .Where(l => l.Status.StartsWith("Approved"))
    .ToListAsync();

            var result = new List<AdminEmployeeAttendanceDto>();

            foreach (var emp in employees)
            {
                var days = new List<AdminAttendanceDayDto>();

                for (int d = 1; d <= DateTime.DaysInMonth(year, month); d++)
                {
                    var date = new DateTime(year, month, d, 0, 0, 0, DateTimeKind.Utc);

                    // Weekend
                    if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "W"
                        });
                        continue;
                    }

                    // Holiday
                    var holiday = holidays.FirstOrDefault(h => h.Holiday_Date.Date == date.Date);
                    if (holiday != null)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "H"
                        });
                        continue;
                    }

                    // Leave
                    var leave = leaves.FirstOrDefault(l =>
                        l.EmployeeId == emp.Employee_Id &&
                        date >= l.FromDate &&
                        date <= l.ToDate);

                    if (leave != null)
                    {
                        days.Add(new AdminAttendanceDayDto
                        {
                            Day = d,
                            Status = "OL"
                        });
                        continue;
                    }

                    // Attendance
                    var att = attendanceData.FirstOrDefault(x =>
                        x.Employee_Id == emp.Employee_Id &&
                        x.Attendance_Date.Date == date.Date);

                    days.Add(new AdminAttendanceDayDto
                    {
                        Day = d,
                        Status = date.Date > DateTime.UtcNow.Date
    ? "-"
    : (att != null ? MapStatus(att.Status) : "Absent"),
                        CheckIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null,
                        CheckOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null,
                        WorkingMinutes = att?.WorkingMinutes ?? 0
                    });
                }

                result.Add(new AdminEmployeeAttendanceDto
                {
                    EmployeeId = emp.Employee_Id,
                    EmployeeName = emp.Name,
                    Days = days
                });
            }

            return result;
        }

        //---------------------------------------

        // REQUIRED METHODS (UNCHANGED)

        //---------------------------------------

        public async Task<IActionResult> GetWeeklyAttendance(ClaimsPrincipal user)
        {
            await CheckMissingCheckouts();

            var emp = await GetEmployee(user);

            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;

            var monday = DateTime.SpecifyKind(today.AddDays(-diff), DateTimeKind.Utc);
            var weekEnd = monday.AddDays(7);

            // Attendance
            var attendances = await _context.Attendance
                .Where(a => a.Employee_Id == emp.Employee_Id &&
                            a.Attendance_Date >= monday &&
                            a.Attendance_Date < weekEnd)
                .AsNoTracking()
                .ToListAsync();

            // Holidays
            var holidays = await _context.Holidays
                .Where(h => h.Holiday_Date >= monday &&
                            h.Holiday_Date < weekEnd)
                .AsNoTracking()
                .ToListAsync();

            // Approved Leaves
            var leaves = await _context.EmployeeLeaves
                .Where(l => l.EmployeeId == emp.Employee_Id &&
                            l.Status.StartsWith("Approved"))
                .AsNoTracking()
                .ToListAsync();

            var result = new List<object>();

            for (int i = 0; i < 7; i++)
            {
                var date = monday.AddDays(i);

                // Weekend
                if (date.DayOfWeek == DayOfWeek.Saturday ||
                    date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Weekend",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // Holiday
                var holiday = holidays.FirstOrDefault(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Holiday",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // Approved Leave
                var leave = leaves.FirstOrDefault(l =>
                    date.Date >= l.FromDate.Date &&
                    date.Date <= l.ToDate.Date);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "On Leave",   // Change to "OL" if required
                        LeaveType = leave.LeaveType, // Optional
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // Attendance
                var att = attendances.FirstOrDefault(a =>
                    a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;
                DateTime? checkOut = null;

                if (att?.Check_In != null)
                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)
                    checkOut = ConvertToIST(att.Check_Out.Value);

                var todayIst = ConvertToIST(DateTime.UtcNow).Date;

                string status;

                if (date.Date > todayIst)
                {
                    status = "-";
                }
                else if (att != null)
                {
                    status = att.Status switch
                    {
                        "Present" => "Present",
                        "Late" => "Late",
                        "Half Day" => "Half Day",
                        "LOP" => "Loss Of Pay",
                        "MC" => "Missed Checkout",
                        "LMC" => "Late Missed Checkout",
                        _ => att.Status
                    };
                }
                else
                {
                    status = "Absent";
                }

                result.Add(new
                {
                    Day = date.DayOfWeek.ToString(),
                    Date = date.ToString("dd MMM yyyy"),
                    Status = status,
                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null
                        ? FormatHours(
                            att.Check_Out != null
                                ? att.WorkingMinutes
                                : Math.Max(
                                    0,
                                    (int)(DateTime.UtcNow - att.Check_In.Value).TotalMinutes
                                    - att.TotalBreakMinutes))
                        : "0h 0m"
                });
            }

            return new OkObjectResult(result);
        }
        public async Task<IActionResult> GetPreviousWeekAttendance(ClaimsPrincipal user)

        {
            await CheckMissingCheckouts();

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow.Date;

            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;

            var currentMonday = DateTime.SpecifyKind(today.AddDays(-diff), DateTimeKind.Utc);

            var monday = currentMonday.AddDays(-7); // ✅ previous week

            var weekEnd = monday.AddDays(7);

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= monday &&

                            a.Attendance_Date < weekEnd)

               .AsNoTracking().ToListAsync();

            var result = new List<object>();


            for (int i = 0; i < 7; i++)
            {
                var date = monday.AddDays(i);

                // ✅ Weekend
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Weekend",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"

                    });
                    continue;
                }

                // ✅ STEP 4: HOLIDAY CHECK
                var holiday = await _context.Holidays
     .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Holiday",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"

                    });

                    continue;
                }

                var att = attendances
                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null;
                DateTime? checkOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null;

                result.Add(new
                {
                    Day = date.DayOfWeek.ToString(),
                    Date = date.ToString("dd MMM yyyy"),
                    Status = att != null
         ? att.Status switch
         {
             "Present" => "Present",
             "Late" => "Late",
             "Half Day" => "Half Day",
             "LOP" => "Loss Of Pay",
             "MC" => "Missed Checkout",
             "LMC" => "Late Missed Checkout",
             _ => att.Status
         }
         : "Absent",

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null
    ? FormatHours(
        att.Check_Out != null
            ? att.WorkingMinutes
            : Math.Max(
                0,
                (int)(DateTime.UtcNow - att.Check_In.Value).TotalMinutes
                  - att.TotalBreakMinutes
              )
      )
    : "0h 0m"

                });

            }

            return new OkObjectResult(result);

        }

        // CURRENT MONTH ATTENDANCE

        public async Task<IActionResult> GetCurrentMonthAttendance(ClaimsPrincipal user)

        {
            await CheckMissingCheckouts();

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow;

            // ✅ First day of current month

            var startOfMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // ✅ Tomorrow (to avoid time issues)

            var tomorrow = today.Date.AddDays(1);
            var employeeId = emp.Employee_Id;

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= startOfMonth &&

                            a.Attendance_Date < tomorrow)

                .AsNoTracking().ToListAsync();

            var totalDays = DateTime.DaysInMonth(today.Year, today.Month);

            var result = new List<object>();

            for (int day = 1; day <= totalDays; day++)

            {

                var date = DateTime.SpecifyKind(

    new DateTime(today.Year, today.Month, day),

    DateTimeKind.Utc

);

                // ✅ Weekend check

                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)

                {

                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Weekend",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"

                    });
                    continue;

                }

                // ✅ Holiday check

                var holiday = await _context.Holidays
    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Holiday",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                // ✅ Leave check

                var leave = await _context.EmployeeLeaves
    .FirstOrDefaultAsync(l =>
        l.EmployeeId == employeeId &&
        l.Status.StartsWith("Approved") &&
        date.Date >= l.FromDate.Date &&
        date.Date <= l.ToDate.Date);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        LeaveType = leave.LeaveType, // ✅ ADD THIS
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                var att = attendances

                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;

                DateTime? checkOut = null;

                if (att?.Check_In != null)

                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)

                    checkOut = ConvertToIST(att.Check_Out.Value);

                result.Add(new
                {
                    Day = day,
                    Status = date.Date > DateTime.UtcNow.Date
           ? "-"
           : (att != null
               ? (att.Status == "Half Day" ? "HD"
                 : att.Status == "Present" ? "P"
                 : att.Status == "Late" ? "P"
                 : att.Status)
               : "A"),

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),

                    Hours = att != null
           ? FormatHours(att.WorkingMinutes)
           : "0h 0m"


                });

            }

            return new OkObjectResult(result);

        }

        //PREVIOUS MONTH

        public async Task<IActionResult> GetPreviousMonthAttendance(ClaimsPrincipal user)

        {
            await CheckMissingCheckouts();

            var emp = await GetEmployee(user);

            if (emp == null)

                return new UnauthorizedObjectResult("Invalid user");

            var today = DateTime.UtcNow;

            var firstDayCurrentMonth = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var lastMonthEnd = firstDayCurrentMonth.AddDays(-1);

            var lastMonthStart = new DateTime(lastMonthEnd.Year, lastMonthEnd.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var attendances = await _context.Attendance

                .Where(a => a.Employee_Id == emp.Employee_Id &&

                            a.Attendance_Date >= lastMonthStart &&

                            a.Attendance_Date <= lastMonthEnd)

                .AsNoTracking().ToListAsync();

            var totalDays = DateTime.DaysInMonth(lastMonthStart.Year, lastMonthStart.Month);

            var employeeId = emp.Employee_Id;


            var result = new List<object>();

            for (int day = 1; day <= totalDays; day++)
            {
                var date = DateTime.SpecifyKind(
                    new DateTime(lastMonthStart.Year, lastMonthStart.Month, day),
                    DateTimeKind.Utc
                );

                // ✅ Weekend
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Weekend",
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ Holiday
                var holiday = await _context.Holidays
    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = date.DayOfWeek.ToString(),
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "Holiday",
                        HolidayName = holiday.Holiday_Name,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });


                    continue;
                }

                // ✅ Leave
                var leave = await _context.EmployeeLeaves
    .FirstOrDefaultAsync(l =>
        l.EmployeeId == employeeId &&
        l.Status.StartsWith("Approved") &&
        date.Date >= l.FromDate.Date &&
        date.Date <= l.ToDate.Date);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = date.Day,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        LeaveType = leave.LeaveType, // ✅ ADD THIS
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });

                    continue;
                }

                var att = attendances
                    .FirstOrDefault(a => a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = att?.Check_In != null ? ConvertToIST(att.Check_In.Value) : null;
                DateTime? checkOut = att?.Check_Out != null ? ConvertToIST(att.Check_Out.Value) : null;

                result.Add(new
                {
                    Day = day,
                    Status = date.Date > DateTime.UtcNow.Date
            ? "-"
            : (att != null
                ? (att.Status == "Half Day" ? "HD"
                  : att.Status == "Present" ? "P"
                  : att.Status == "Late" ? "P"
                  : att.Status)
                : "A"),

                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),

                    Hours = att != null
            ? FormatHours(att.WorkingMinutes)
            : "0h 0m",


                });
            }

            return new OkObjectResult(result);

        }

        public async Task CheckMissedCheckIns()
        {
            await Task.CompletedTask;
        }


        public async Task CheckMissingCheckouts()
        {
            var today = DateTime.UtcNow.Date;

            var records = await _context.Attendance
                .Where(a =>
                    a.Attendance_Date.Date < today &&
                    a.Check_In != null &&
                    a.Check_Out == null &&
                    a.Status != "LOP" &&
                    a.Status != "MC")
                .ToListAsync();


            foreach (var record in records)
            {
                var istCheckIn = ConvertToIST(record.Check_In.Value);

                if (istCheckIn.TimeOfDay > new TimeSpan(9, 15, 0))
                {
                    record.Status = "LMC";
                }
                else
                {
                    record.Status = "MC";
                }

                await _context.SaveChangesAsync();
            }
        }


        public async Task<object> GetTodayStats()
        {
            await CheckMissingCheckouts();

            var today = DateTime.UtcNow.Date;

            var totalEmployees = await _context.Employees.CountAsync();

            var todayAttendance = await _context.Attendance
                .Where(a => a.Attendance_Date.Date == today)
                .AsNoTracking()
                .ToListAsync();

            var presentCount = todayAttendance.Count(a => a.Status == "Present");

            var lateCount = todayAttendance.Count(a => a.Status == "Late");

            var missedCheckoutCount = todayAttendance.Count(a => a.Status == "MC");

            var lopCount = todayAttendance.Count(a => a.Status == "LOP");

            var absentCount = totalEmployees -
                (presentCount + lateCount + missedCheckoutCount + lopCount);

            return new
            {
                TotalEmployees = totalEmployees,
                Present = presentCount,
                Late = lateCount,
                MissedCheckout = missedCheckoutCount,
                LossOfPay = lopCount,
                Absent = absentCount
            };
        }
        public async Task<IActionResult> GetMonthAttendance(
    ClaimsPrincipal user,
    int month,
    int year)
        {
            var emp = await GetEmployee(user);
            if (emp == null)
                return new UnauthorizedObjectResult("Invalid user");

            var employeeId = emp.Employee_Id;

            var daysInMonth = DateTime.DaysInMonth(year, month);

            var result = new List<object>();

            for (int i = 1; i <= daysInMonth; i++)
            {
                var date = DateTime.SpecifyKind(
    new DateTime(year, month, i),
    DateTimeKind.Utc
);

                // ✅ WEEKEND
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "W",
                        HolidayName = (string?)null,
                        LeaveType = (string?)null,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ HOLIDAY
                var holiday = await _context.Holidays
                    .FirstOrDefaultAsync(h => h.Holiday_Date.Date == date.Date);

                if (holiday != null)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "H",
                        HolidayName = holiday.Holiday_Name,
                        LeaveType = (string?)null,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ LEAVE
                var leave = await _context.EmployeeLeaves
                    .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                                             l.Status == "Approved" &&
                                             date >= l.FromDate &&
                                             date <= l.ToDate);

                if (leave != null)
                {
                    result.Add(new
                    {
                        Day = i,
                        Date = date.ToString("dd MMM yyyy"),
                        Status = "L",
                        HolidayName = (string?)null,
                        LeaveType = leave.LeaveType,
                        CheckIn = (string?)null,
                        CheckOut = (string?)null,
                        Hours = "0h 0m"
                    });
                    continue;
                }

                // ✅ ATTENDANCE
                var att = await _context.Attendance
                    .FirstOrDefaultAsync(a => a.Employee_Id == employeeId &&
                                             a.Attendance_Date.Date == date.Date);

                DateTime? checkIn = null;
                DateTime? checkOut = null;

                if (att?.Check_In != null)
                    checkIn = ConvertToIST(att.Check_In.Value);

                if (att?.Check_Out != null)
                    checkOut = ConvertToIST(att.Check_Out.Value);

                result.Add(new
                {
                    Day = i,
                    Date = date.ToString("dd MMM yyyy"),
                    Status = date.Date > DateTime.UtcNow.Date
    ? "-"
    : (att != null
        ? (att.Status == "Half Day" ? "HD"
          : att.Status == "Present" ? "P"
          : att.Status == "Late" ? "P"
          : att.Status)
        : "A"),
                    HolidayName = (string?)null,
                    LeaveType = (string?)null,
                    CheckIn = checkIn?.ToString("hh:mm tt"),
                    CheckOut = checkOut?.ToString("hh:mm tt"),
                    Hours = att != null ? FormatHours(att.WorkingMinutes) : "0h 0m"
                });
            }

            return new OkObjectResult(result);
        }

        public async Task<object> GetYearlySummary(int year)

        {
            await CheckMissingCheckouts();
            var result = new List<object>();

            for (int month = 1; month <= 12; month++)
            {
                var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var endDate = startDate.AddMonths(1);

                var attendance = await _context.Attendance
                    .Where(a => a.Attendance_Date >= startDate &&
                                a.Attendance_Date < endDate)
                   .AsNoTracking().ToListAsync();

                var presentCount = attendance.Count(a => a.Status == "Present");
                var lateCount = attendance.Count(a => a.Status == "Late");

                // Optional: you can calculate absent based on employee count
                var totalEmployees = await _context.Employees.CountAsync();
                var workingDays = DateTime.DaysInMonth(year, month);

                var totalExpected = totalEmployees * workingDays;

                var absentCount = totalExpected - (presentCount + lateCount);

                result.Add(new
                {
                    Month = new DateTime(year, month, 1).ToString("MMMM"),
                    Present = presentCount,
                    Late = lateCount,
                    Absent = absentCount
                });
            }

            return result;
        }

        public async Task<IActionResult> AdminUpdateAttendance(
            string employeeId,
            DateTime date,
            DateTime? checkIn,
            DateTime? checkOut)
        {
            if (date.Date > DateTime.UtcNow.Date)
                return new BadRequestObjectResult("Cannot mark future attendance");

            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
            {
                return new BadRequestObjectResult(
                    "Weekend attendance cannot be updated");
            }

            var utcDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);

            // Holiday check
            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == utcDate.Date);

            if (isHoliday)
            {
                return new BadRequestObjectResult("Holiday attendance cannot be updated");
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == employeeId &&
                    a.Attendance_Date.Date == utcDate.Date);

            var istZone = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");

            DateTime? checkInUtc = null;
            DateTime? checkOutUtc = null;

            if (checkIn != null && checkIn.Value.TimeOfDay == TimeSpan.Zero)
                return new BadRequestObjectResult("Invalid check-in time");

            if (checkOut != null && checkOut.Value.TimeOfDay == TimeSpan.Zero)
                return new BadRequestObjectResult("Invalid check-out time");

            if (checkIn != null)
            {
                checkInUtc = TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(checkIn.Value, DateTimeKind.Unspecified),
                    istZone);
            }

            if (checkOut != null)
            {
                checkOutUtc = TimeZoneInfo.ConvertTimeToUtc(
                    DateTime.SpecifyKind(checkOut.Value, DateTimeKind.Unspecified),
                    istZone);
            }

            if (checkInUtc != null &&
                checkOutUtc != null &&
                checkOutUtc < checkInUtc)
            {
                return new BadRequestObjectResult("Check-out cannot be before check-in");
            }

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = employeeId,
                    Attendance_Date = utcDate
                };

                _context.Attendance.Add(attendance);
            }

            attendance.Check_In = checkInUtc;
            attendance.Check_Out = checkOutUtc;

            if (attendance.Check_In != null &&
                attendance.Check_Out != null)
            {
                var minutes = (int)(attendance.Check_Out.Value - attendance.Check_In.Value).TotalMinutes;

                attendance.WorkingMinutes = minutes;

                var hours = minutes / 60.0;

                if (hours >= 3 && hours < 4)
                {
                    attendance.Status = "Half Day";
                }
                else if (hours >= 4)
                {
                    if (attendance.Status != "Late")
                        attendance.Status = "Present";
                }
                else
                {
                    attendance.Status = "Absent";
                }
            }
            else if (attendance.Check_In != null &&
                     attendance.Check_Out == null)
            {
                attendance.WorkingMinutes = 0;
                attendance.Status = "Present";
            }
            else
            {
                attendance.WorkingMinutes = 0;
                attendance.Status = "Absent";
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult("Attendance updated by admin");
        }

        //ATTENDANCE SUMMARY

        public async Task<AttendanceSummaryDto> GetMonthlyAttendanceSummary(string employeeId, int month, int year)

        {
            await CheckMissingCheckouts();

            var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);

            var end = start.AddMonths(1);

            // Attendance

            var attendances = await _context.Attendance

                .AsNoTracking()

                .Where(a =>

                    a.Employee_Id == employeeId &&

                    a.Attendance_Date >= start &&

                    a.Attendance_Date < end)

                .ToListAsync();
            foreach (var a in attendances)
            {
                Console.WriteLine("================================");
                Console.WriteLine($"Id             : {a.Id}");
                Console.WriteLine($"Employee       : {a.Employee_Id}");
                Console.WriteLine($"Date           : {a.Attendance_Date}");
                Console.WriteLine($"Status         : {a.Status}");
                Console.WriteLine($"Check_In       : {a.Check_In}");
                Console.WriteLine($"Check_Out      : {a.Check_Out}");
                Console.WriteLine($"WorkingMinutes : {a.WorkingMinutes}");
                Console.WriteLine("================================");
            }
            var attendanceLookup = attendances

                .GroupBy(a => a.Attendance_Date.Date)

                .ToDictionary(g => g.Key, g => g.First());

            // Holidays

            var holidaySet = (await _context.Holidays

                .AsNoTracking()

                .Where(h =>

                    h.Holiday_Date >= start &&

                    h.Holiday_Date < end)

                .Select(h => h.Holiday_Date.Date)

                .ToListAsync())

                .ToHashSet();

            // Leaves

            var leaves = await _context.EmployeeLeaves
     .Where(l =>
         l.EmployeeId == employeeId &&
         l.Status.StartsWith("Approved"))
     .ToListAsync();

            decimal present = 0;

            int absent = 0;
            int lopDays = 0;

            int totalDays = DateTime.DaysInMonth(year, month);

            for (int day = 1; day <= totalDays; day++)

            {

                var date = new DateTime(

                    year,

                    month,

                    day,

                    0,

                    0,

                    0,

                    DateTimeKind.Utc);

                // Weekend

                if (date.DayOfWeek == DayOfWeek.Saturday ||

                    date.DayOfWeek == DayOfWeek.Sunday)

                {

                    continue;

                }

                // Holiday

                if (holidaySet.Contains(date.Date))

                {

                    continue;

                }

                // Leave

                bool isLeave = leaves.Any(l =>

                    date >= l.FromDate &&

                    date <= l.ToDate);

                if (isLeave)

                {

                    present++;

                    continue;

                }

                // Attendance

                if (attendanceLookup.TryGetValue(date.Date, out var att))
                {
                    if (att.Status == "LOP")
                    {
                        lopDays++;
                    }
                    else if (att.Status == "Half Day")
                    {
                        present += 0.5m;
                    }
                    else
                    {
                        present += 1m;
                    }
                }
                else
                {
                    absent++;
                }
            }

            return new AttendanceSummaryDto
            {
                PresentDays = present,
                AbsentDays = absent,
                LopDays = lopDays
            };

        }


        public async Task<string> UploadMonthlyAttendance(

      IFormFile file,

      int month,

      int year)

        {

            try

            {

                if (file == null || file.Length == 0)

                    return "No file uploaded";

                if (month < 1 || month > 12)

                    return "Invalid month";

                if (year < 2000 || year > 2100)

                    return "Invalid year";

                if (!Path.GetExtension(file.FileName)

                    .Equals(".xlsx", StringComparison.OrdinalIgnoreCase))

                {

                    return "Please upload only .xlsx files";

                }

                using var stream = new MemoryStream();

                await file.CopyToAsync(stream);

                stream.Position = 0;

                using var workbook = new XLWorkbook(stream);

                var worksheet = workbook.Worksheet(1);

                if (worksheet == null)

                    return "Worksheet not found";

                var lastRowUsed = worksheet.LastRowUsed();

                if (lastRowUsed == null)

                    return "Excel file is empty";

                int lastRow = lastRowUsed.RowNumber();

                var monthStart = new DateTime(year, month, 1);

                var monthEnd = monthStart.AddMonths(1);

                // Load attendance records once

                var attendanceList = await _context.Attendance

                    .Where(x =>

                        x.Attendance_Date >= monthStart &&

                        x.Attendance_Date < monthEnd)

                    .ToListAsync();

                var attendanceDictionary = attendanceList

                    .ToDictionary(

                        x => $"{x.Employee_Id.Trim()}_{x.Attendance_Date:yyyy-MM-dd}",

                        x => x);

                // Load employees once

                var employeeIds = await _context.Employees

                    .Select(x => x.Employee_Id)

                    .ToListAsync();

                var employeeSet = employeeIds

                    .Where(x => !string.IsNullOrWhiteSpace(x))

                    .Select(x => x.Trim())

                    .ToHashSet();

                int updatedCount = 0;

                int insertedCount = 0;

                int skippedEmployees = 0;

                for (int row = 2; row <= lastRow; row++)

                {

                    var employeeId = worksheet

                        .Cell(row, 1)

                        .GetString()

                        .Trim();

                    if (string.IsNullOrWhiteSpace(employeeId))

                        continue;

                    if (!employeeSet.Contains(employeeId))

                    {

                        skippedEmployees++;

                        continue;

                    }

                    for (

                        int day = 1;

                        day <= DateTime.DaysInMonth(year, month);

                        day++

                    )

                    {

                        var excelStatus = worksheet

                            .Cell(row, day + 2)

                            .GetString()

                            .Trim()

                            .ToUpper();

                        if (string.IsNullOrWhiteSpace(excelStatus))

                            continue;

                        string dbStatus = excelStatus switch

                        {

                            "P" => "Present",

                            "A" => "Absent",

                            "HD" => "Half Day",

                            "LOP" => "LOP",

                            "LT" => "Late",

                            "W" => null,

                            "H" => null,

                            _ => null

                        };

                        if (string.IsNullOrWhiteSpace(dbStatus))

                            continue;

                        var attendanceDate =

                            new DateTime(year, month, day);

                        var key =

                            $"{employeeId}_{attendanceDate:yyyy-MM-dd}";

                        if (attendanceDictionary.TryGetValue(

                            key,

                            out var attendance))

                        {

                            attendance.Status = dbStatus;

                            updatedCount++;

                        }

                        else

                        {

                            var newAttendance = new Attendance

                            {

                                Employee_Id = employeeId,

                                Attendance_Date = attendanceDate,

                                Status = dbStatus,

                                Check_In = null,

                                Check_Out = null,

                                WorkingMinutes = 0,

                                TotalBreakMinutes = 0,

                                IsLocationMismatch = false

                            };

                            _context.Attendance.Add(newAttendance);

                            attendanceDictionary.Add(

                                key,

                                newAttendance

                            );

                            insertedCount++;

                        }

                    }

                }

                await _context.SaveChangesAsync();

                return $"Attendance Upload Completed. Updated: {updatedCount}, Inserted: {insertedCount}, Skipped Employees: {skippedEmployees}";

            }

            catch (Exception ex)

            {

                return $"Upload Failed : {ex.Message}";

            }

        }


        public async Task<IActionResult> GetEmployeeWorkingHours(
    string employeeId,
    DateOnly fromDate,
    DateOnly toDate)
        {
            var startDate = DateTime.SpecifyKind(
                fromDate.ToDateTime(TimeOnly.MinValue),
                DateTimeKind.Utc);

            var endDate = DateTime.SpecifyKind(
                toDate.ToDateTime(TimeOnly.MinValue).AddDays(1),
                DateTimeKind.Utc);

            // selected date range attendance
            var attendance = await _context.Attendance
                .Where(a => a.Employee_Id == employeeId &&
                            a.Attendance_Date >= startDate &&
                            a.Attendance_Date < endDate)
                .OrderBy(a => a.Attendance_Date)
                .Select(a => new
                {
                    a.Attendance_Date,
                    a.WorkingMinutes,
                    a.Status
                })
                .ToListAsync();

            var totalSelectedMinutes = attendance.Sum(a => a.WorkingMinutes);

            // day-wise data
            var dailyWorkingHours = attendance
                .GroupBy(a => a.Attendance_Date.Date)
                .Select(g => new
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Day = g.Key.DayOfWeek.ToString(),
                    Status = g.First().Status,
                    WorkingHours = Math.Round(g.Sum(x => x.WorkingMinutes) / 60.0, 2)
                })
                .ToList();

            // week-wise data
            var weeklyWorkingHours = attendance
                .GroupBy(a =>
                {
                    var date = a.Attendance_Date.Date;
                    int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                    return date.AddDays(-diff);
                })
                .Select(g => new
                {
                    WeekStart = g.Key < startDate.Date
                        ? startDate.Date.ToString("yyyy-MM-dd")
                        : g.Key.ToString("yyyy-MM-dd"),

                    WeekEnd = g.Key.AddDays(6) > toDate.ToDateTime(TimeOnly.MinValue).Date
                        ? toDate.ToString("yyyy-MM-dd")
                        : g.Key.AddDays(6).ToString("yyyy-MM-dd"),

                    TotalWorkingHours = Math.Round(g.Sum(x => x.WorkingMinutes) / 60.0, 2),

                    Days = g.Select(x => new
                    {
                        Date = x.Attendance_Date.ToString("yyyy-MM-dd"),
                        Day = x.Attendance_Date.DayOfWeek.ToString(),
                        Status = x.Status,
                        WorkingHours = Math.Round(x.WorkingMinutes / 60.0, 2)
                    }).ToList()
                })
                .ToList();

            // complete month working hours based on fromDate month
            var monthStart = new DateTime(fromDate.Year, fromDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);

            var monthlyMinutes = await _context.Attendance
                .Where(a => a.Employee_Id == employeeId &&
                            a.Attendance_Date >= monthStart &&
                            a.Attendance_Date < monthEnd)
                .SumAsync(a => (int?)a.WorkingMinutes) ?? 0;

            return new OkObjectResult(new
            {
                EmployeeId = employeeId,
                FromDate = fromDate.ToString("yyyy-MM-dd"),
                ToDate = toDate.ToString("yyyy-MM-dd"),

                SelectedRangeWorkingHours = Math.Round(totalSelectedMinutes / 60.0, 2),

                DailyWorkingHours = dailyWorkingHours,

                WeeklyWorkingHours = weeklyWorkingHours,

                Month = fromDate.ToString("MMMM yyyy"),
                CompleteMonthWorkingHours = Math.Round(monthlyMinutes / 60.0, 2)
            });
        }

        public async Task<byte[]> ExportMonthlyAttendance(int month, int year)
        {
            await CheckMissingCheckouts();
            var attendance = await GetAllEmployeeAttendance(month, year);
            var monthName = new DateTime(year, month, 1).ToString("MMMM");

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add($"{monthName} Attendance");

            worksheet.Cell(1, 1).Value = "Employee Id";
            worksheet.Cell(1, 2).Value = "Employee Name";


            int totalDays = DateTime.DaysInMonth(year, month);

            for (int day = 1; day <= totalDays; day++)
            {
                worksheet.Cell(1, day + 2).Value = day;
            }
            worksheet.Cell(1, totalDays + 3).Value = "P";
            worksheet.Cell(1, totalDays + 4).Value = "A";
            worksheet.Cell(1, totalDays + 5).Value = "OL";
            worksheet.Cell(1, totalDays + 6).Value = "LT";
            worksheet.Cell(1, totalDays + 7).Value = "W";
            worksheet.Cell(1, totalDays + 8).Value = "HD";
            worksheet.Cell(1, totalDays + 9).Value = "H";
            var header = worksheet.Range(1, 1, 1, totalDays + 2);

            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

            int row = 2;

            foreach (var emp in attendance)
            {
                int presentCount = 0;
                int absentCount = 0;
                int leaveCount = 0;
                int lateCount = 0;
                int weekendCount = 0;
                int halfDayCount = 0;
                int holidayCount = 0;
                int lopCount = 0;
                worksheet.Cell(row, 1).Value = emp.EmployeeId;
                worksheet.Cell(row, 2).Value = emp.EmployeeName;

                for (int i = 0; i < emp.Days.Count; i++)
                {
                    var status = emp.Days[i].Status;
                    switch (status)
                    {
                        case "Present":
                        case "P":
                            presentCount++;
                            break;

                        case "Absent":
                        case "A":
                            absentCount++;
                            break;

                        case "L":
                        case "On Leave":
                            leaveCount++;
                            break;

                        case "Late":
                        case "LT":
                            lateCount++;
                            break;

                        case "W":
                            weekendCount++;
                            break;

                        case "HD":
                        case "Half Day":
                            halfDayCount++;
                            break;

                        case "H":
                            holidayCount++;
                            break;

                        case "LOP":
                        case "Loss Of Pay":
                            lopCount++;
                            break;
                    }


                    var cell = worksheet.Cell(row, i + 3);
                    cell.Value = status;

                    ApplyStatusColor(cell, status);
                }
                worksheet.Cell(row, totalDays + 3).Value = presentCount;
                worksheet.Cell(row, totalDays + 4).Value = absentCount;
                worksheet.Cell(row, totalDays + 5).Value = leaveCount;
                worksheet.Cell(row, totalDays + 6).Value = lateCount;
                worksheet.Cell(row, totalDays + 7).Value = weekendCount;
                worksheet.Cell(row, totalDays + 8).Value = halfDayCount;
                worksheet.Cell(row, totalDays + 9).Value = holidayCount;
                worksheet.Cell(1, totalDays + 10).Value = "LOP";

                worksheet.Cell(row, totalDays + 10).Value = lopCount;

                row++;
            }

            worksheet.Rows().Height = 24;

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }

        public async Task<byte[]> ExportAbsentEmployees(DateTime date)
        {
            await CheckMissingCheckouts();
            date = date.Date;

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendance = await _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date.Date == date)
                .ToListAsync();

            var absentEmployees = employees
                .Where(emp => !attendance.Any(a => a.Employee_Id == emp.Employee_Id))
                .ToList();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Absent Employees");

            worksheet.Cell(1, 1).Value = "Employee ID";
            worksheet.Cell(1, 2).Value = "Employee Name";
            worksheet.Cell(1, 3).Value = "Department";
            worksheet.Cell(1, 4).Value = "Date";
            worksheet.Cell(1, 5).Value = "Status";

            int row = 2;

            foreach (var emp in absentEmployees)
            {
                worksheet.Cell(row, 1).Value = emp.Employee_Id;
                worksheet.Cell(row, 2).Value = emp.Name;
                worksheet.Cell(row, 3).Value = emp.Department;
                worksheet.Cell(row, 4).Value = date.ToString("dd-MMM-yyyy");
                worksheet.Cell(row, 5).Value = "Absent";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }

        public async Task<byte[]> ExportPresentAndLateEmployees(DateTime date)
        {
            await CheckMissingCheckouts();
            date = date.Date;

            var attendance = await _context.Attendance
                .AsNoTracking()
                .Where(a =>
                    a.Attendance_Date.Date == date &&
                    (a.Status == "Present" || a.Status == "Late"))
                .ToListAsync();

            var employees = await _context.Employees
                .AsNoTracking()
                .ToDictionaryAsync(e => e.Employee_Id);

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Present & Late");

            worksheet.Cell(1, 1).Value = "Employee ID";
            worksheet.Cell(1, 2).Value = "Employee Name";
            worksheet.Cell(1, 3).Value = "Department";
            worksheet.Cell(1, 4).Value = "Check In";
            worksheet.Cell(1, 5).Value = "Check Out";
            worksheet.Cell(1, 6).Value = "Status";

            int row = 2;

            foreach (var att in attendance)
            {
                if (!employees.TryGetValue(att.Employee_Id, out var emp))
                    continue;

                worksheet.Cell(row, 1).Value = emp.Employee_Id;
                worksheet.Cell(row, 2).Value = emp.Name;
                worksheet.Cell(row, 3).Value = emp.Department;
                worksheet.Cell(row, 4).Value =
    att.Check_In != null
        ? ConvertToIST(att.Check_In.Value).ToString("dd-MM-yyyy hh:mm tt")
        : "-";

                worksheet.Cell(row, 5).Value =
                    att.Check_Out != null
                        ? ConvertToIST(att.Check_Out.Value).ToString("dd-MM-yyyy hh:mm tt")
                        : "-";
                worksheet.Cell(row, 6).Value = att.Status;

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }



        public async Task<byte[]> ExportWeeklyAttendance(DateTime weekStartDate)
        {
            await CheckMissingCheckouts();
            var monday = DateTime.SpecifyKind(weekStartDate.Date, DateTimeKind.Utc);
            var weekEnd = monday.AddDays(7);

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date >= monday && a.Attendance_Date < weekEnd)
                .ToListAsync();

            var holidays = await _context.Holidays
                .AsNoTracking()
                .Where(h => h.Holiday_Date >= monday && h.Holiday_Date < weekEnd)
                .ToListAsync();

            var leaves = await _context.EmployeeLeaves
     .AsNoTracking()
     .Where(l => l.Status.StartsWith("Approved"))
     .ToListAsync();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Weekly Attendance");

            worksheet.Cell(1, 1).Value = "Employee Id";
            worksheet.Cell(1, 2).Value = "Employee Name";

            for (int i = 0; i < 7; i++)
            {
                worksheet.Cell(1, i + 3).Value = monday.AddDays(i).ToString("dddd dd MMM");
            }
            worksheet.Cell(1, 10).Value = "P";
            worksheet.Cell(1, 11).Value = "A";
            worksheet.Cell(1, 12).Value = "OL";
            worksheet.Cell(1, 13).Value = "LT";
            worksheet.Cell(1, 14).Value = "W";
            worksheet.Cell(1, 15).Value = "HD";
            worksheet.Cell(1, 16).Value = "H";

            var header = worksheet.Range(1, 1, 1, 9);

            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1F2937");
            header.Style.Font.FontColor = XLColor.White;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;

            int row = 2;

            foreach (var emp in employees)
            {
                int presentCount = 0;
                int absentCount = 0;
                int leaveCount = 0;
                int lateCount = 0;
                int weekendCount = 0;
                int halfDayCount = 0;
                int holidayCount = 0;
                worksheet.Cell(row, 1).Value = emp.Employee_Id;
                worksheet.Cell(row, 2).Value = emp.Name;

                for (int i = 0; i < 7; i++)
                {
                    var date = monday.AddDays(i);

                    string status;

                    if (date.DayOfWeek == DayOfWeek.Saturday ||
                        date.DayOfWeek == DayOfWeek.Sunday)
                    {
                        status = "W";
                    }
                    else if (holidays.Any(h => h.Holiday_Date.Date == date.Date))
                    {
                        status = "H";
                    }
                    else if (leaves.Any(l =>
                        l.EmployeeId == emp.Employee_Id &&
                        date >= l.FromDate.Date &&
                        date <= l.ToDate.Date))
                    {
                        status = "L";
                    }
                    else
                    {
                        var att = attendanceData.FirstOrDefault(a =>
                            a.Employee_Id == emp.Employee_Id &&
                            a.Attendance_Date.Date == date.Date);

                        status = att != null ? MapStatus(att.Status) : "Absent";
                    }

                    var cell = worksheet.Cell(row, i + 3);
                    cell.Value = status;
                    switch (status)
                    {
                        case "P":
                        case "Present":
                            presentCount++;
                            break;

                        case "A":
                        case "Absent":
                            absentCount++;
                            break;

                        case "L":
                        case "On Leave":
                            leaveCount++;
                            break;

                        case "LT":
                        case "Late":
                            lateCount++;
                            break;

                        case "W":
                            weekendCount++;
                            break;

                        case "HD":
                        case "Half Day":
                            halfDayCount++;
                            break;

                        case "H":
                            holidayCount++;
                            break;
                    }

                    ApplyStatusColor(cell, status);
                }
                worksheet.Cell(row, 10).Value = presentCount;
                worksheet.Cell(row, 11).Value = absentCount;
                worksheet.Cell(row, 12).Value = leaveCount;
                worksheet.Cell(row, 13).Value = lateCount;
                worksheet.Cell(row, 14).Value = weekendCount;
                worksheet.Cell(row, 15).Value = halfDayCount;
                worksheet.Cell(row, 16).Value = holidayCount;

                row++;
            }

            worksheet.Rows().Height = 24;
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }
        public async Task<byte[]> ExportDailyAttendance(DateTime date)
        {
            await CheckMissingCheckouts();
            date = date.Date;

            var employees = await _context.Employees
                .AsNoTracking()
                .ToListAsync();

            var attendanceData = await _context.Attendance
                .AsNoTracking()
                .Where(a => a.Attendance_Date.Date == date)
                .ToListAsync();
            var reportData = employees

        .Select(emp => {
            var att = attendanceData.FirstOrDefault(a => a.Employee_Id == emp.Employee_Id);

            var status = att != null
        ? MapStatus(att.Status)
        : "Absent";

            return new
            {
                Employee = emp,
                Attendance = att,
                Status = status
            };

        }).OrderBy(x => x.Status == "Present" ? 1 : x.Status == "Late" ? 2 : x.Status == "Half Day" ? 3 : x.Status == "On Leave" ? 4 : 5).ThenBy(x => x.Attendance?.Check_In);

            var presentEmployees = reportData
     .Where(x => x.Attendance != null &&
                 x.Attendance.Status != "MC" &&
                 x.Attendance.Status != "LOP")
     .ToList();

            var absentEmployees = reportData
                .Where(x => x.Attendance == null)
                .ToList();

            var lateEmployees = reportData
                .Where(x =>
                    x.Attendance?.Check_In != null &&
                    ConvertToIST(x.Attendance.Check_In.Value)
                        .TimeOfDay > new TimeSpan(9, 15, 0))
                .ToList();
            var lopEmployees = reportData
    .Where(x =>
        x.Attendance != null &&
        x.Attendance.Status == "LOP")
    .ToList();

            var missedCheckoutEmployees = reportData
                .Where(x =>
                    x.Attendance != null &&
                    x.Attendance.Status == "MC")
                .ToList();

            var lateMissedCheckoutEmployees = reportData
                .Where(x =>
                    x.Attendance != null &&
                    x.Attendance.Status == "MC" &&
                    x.Attendance.Check_In != null &&
                    ConvertToIST(x.Attendance.Check_In.Value)
                        .TimeOfDay > new TimeSpan(9, 15, 0))
                .ToList();
            using var workbook = new XLWorkbook();

            var presentSheet =
                workbook.Worksheets.Add("Present Employees");

            var absentSheet =
                workbook.Worksheets.Add("Absent Employees");

            var lateSheet =
                workbook.Worksheets.Add("Late Employees");

            var lopSheet = workbook.Worksheets.Add("LOP Employees");

            var mcSheet = workbook.Worksheets.Add("Missed Checkouts");

            var lateMcSheet = workbook.Worksheets.Add("Late Missed Checkouts");

            //=====================================
            // PRESENT EMPLOYEES SHEET
            //=====================================

            presentSheet.Cell(1, 1).Value =

        "Present Employees Report";

            presentSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            presentSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            presentSheet.Cell(3, 4).Value =
                $"Total Present : {presentEmployees.Count}";

            presentSheet.Cell(5, 1).Value = "Employee ID";
            presentSheet.Cell(5, 2).Value = "Employee Name";
            presentSheet.Cell(5, 3).Value = "Department";
            presentSheet.Cell(5, 4).Value = "Date";
            presentSheet.Cell(5, 5).Value = "Check In";
            presentSheet.Cell(5, 6).Value = "Check Out";
            presentSheet.Cell(5, 7).Value = "Working Hours";

            var presentHeader =

        presentSheet.Range(5, 1, 5, 7);

            presentHeader.Style.Font.Bold = true;
            presentHeader.Style.Fill.BackgroundColor =
                XLColor.DarkBlue;

            presentHeader.Style.Font.FontColor =
                XLColor.White;

            int presentRow = 6;

            foreach (var item in presentEmployees)
            {
                var emp = item.Employee;
                var att = item.Attendance;

                presentSheet.Cell(presentRow, 1).Value =
                    emp.Employee_Id;

                presentSheet.Cell(presentRow, 2).Value =
                    emp.Name;

                presentSheet.Cell(presentRow, 3).Value =
                    emp.Department;

                presentSheet.Cell(presentRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                presentSheet.Cell(presentRow, 5).Value =
                    att?.Check_In != null
                    ? ConvertToIST(att.Check_In.Value)
                        .ToString("hh:mm tt")
                    : "-";

                presentSheet.Cell(presentRow, 6).Value =
                    att?.Check_Out != null
                    ? ConvertToIST(att.Check_Out.Value)
                        .ToString("hh:mm tt")
                    : "-";

                presentSheet.Cell(presentRow, 7).Value =
                    att != null
    ? FormatHours(att.WorkingMinutes)
    : "0h 0m";
                presentRow++;
            }

            presentSheet.Columns()
                .AdjustToContents();

            //=====================================
            // ABSENT EMPLOYEES SHEET
            //=====================================

            absentSheet.Cell(1, 1).Value =

        "Absent Employees Report";

            absentSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            absentSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            absentSheet.Cell(3, 4).Value =
                $"Total Absent : {absentEmployees.Count}";

            absentSheet.Cell(5, 1).Value = "Employee ID";
            absentSheet.Cell(5, 2).Value = "Employee Name";
            absentSheet.Cell(5, 3).Value = "Department";
            absentSheet.Cell(5, 4).Value = "Date";
            absentSheet.Cell(5, 5).Value = "Status";

            var absentHeader =

        absentSheet.Range(5, 1, 5, 5);

            absentHeader.Style.Font.Bold = true;
            absentHeader.Style.Fill.BackgroundColor =
                XLColor.DarkRed;

            absentHeader.Style.Font.FontColor =
                XLColor.White;

            int absentRow = 6;

            foreach (var item in absentEmployees)
            {
                absentSheet.Cell(absentRow, 1).Value =
                    item.Employee.Employee_Id;

                absentSheet.Cell(absentRow, 2).Value =
                    item.Employee.Name;

                absentSheet.Cell(absentRow, 3).Value =
                    item.Employee.Department;

                absentSheet.Cell(absentRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                absentSheet.Cell(absentRow, 5).Value =
                    "Absent";

                absentRow++;
            }

            absentSheet.Columns()
                .AdjustToContents();


            //----- LOP sheets ------
            lopSheet.Cell(1, 1).Value = "LOP Employees Report";

            lopSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            lopSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            lopSheet.Cell(3, 4).Value =
                $"Total LOP : {lopEmployees.Count}";

            lopSheet.Cell(5, 1).Value = "Employee ID";
            lopSheet.Cell(5, 2).Value = "Employee Name";
            lopSheet.Cell(5, 3).Value = "Department";
            lopSheet.Cell(5, 4).Value = "Date";
            lopSheet.Cell(5, 5).Value = "Status";

            var lopHeader = lopSheet.Range(5, 1, 5, 5);

            lopHeader.Style.Font.Bold = true;
            lopHeader.Style.Fill.BackgroundColor = XLColor.Red;
            lopHeader.Style.Font.FontColor = XLColor.White;

            int lopRow = 6;

            foreach (var item in lopEmployees)
            {
                lopSheet.Cell(lopRow, 1).Value =
                    item.Employee.Employee_Id;

                lopSheet.Cell(lopRow, 2).Value =
                    item.Employee.Name;

                lopSheet.Cell(lopRow, 3).Value =
                    item.Employee.Department;

                lopSheet.Cell(lopRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                lopSheet.Cell(lopRow, 5).Value =
                    "LOP";

                lopRow++;
            }

            lopSheet.Columns().AdjustToContents();


            // ---- MIssed Checkout sheets -------
            mcSheet.Cell(1, 1).Value =
    "Missed Checkout Employees Report";

            mcSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            mcSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            mcSheet.Cell(3, 4).Value =
                $"Total MC : {missedCheckoutEmployees.Count}";

            mcSheet.Cell(5, 1).Value = "Employee ID";
            mcSheet.Cell(5, 2).Value = "Employee Name";
            mcSheet.Cell(5, 3).Value = "Department";
            mcSheet.Cell(5, 4).Value = "Date";
            mcSheet.Cell(5, 5).Value = "Check In";
            mcSheet.Cell(5, 6).Value = "Status";

            var mcHeader = mcSheet.Range(5, 1, 5, 6);

            mcHeader.Style.Font.Bold = true;
            mcHeader.Style.Fill.BackgroundColor = XLColor.Brown;
            mcHeader.Style.Font.FontColor = XLColor.White;

            int mcRow = 6;

            foreach (var item in missedCheckoutEmployees)
            {
                mcSheet.Cell(mcRow, 1).Value =
                    item.Employee.Employee_Id;

                mcSheet.Cell(mcRow, 2).Value =
                    item.Employee.Name;

                mcSheet.Cell(mcRow, 3).Value =
                    item.Employee.Department;

                mcSheet.Cell(mcRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                mcSheet.Cell(mcRow, 5).Value =
                    item.Attendance?.Check_In != null
                        ? ConvertToIST(item.Attendance.Check_In.Value)
                            .ToString("hh:mm tt")
                        : "-";

                mcSheet.Cell(mcRow, 6).Value = "MC";

                mcRow++;
            }

            mcSheet.Columns().AdjustToContents();

            //---  LAte Missed CHeckouts,----
            lateMcSheet.Cell(1, 1).Value =
    "Late Missed Checkout Report";

            lateMcSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            lateMcSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            lateMcSheet.Cell(3, 4).Value =
                $"Total Late MC : {lateMissedCheckoutEmployees.Count}";

            lateMcSheet.Cell(5, 1).Value = "Employee ID";
            lateMcSheet.Cell(5, 2).Value = "Employee Name";
            lateMcSheet.Cell(5, 3).Value = "Department";
            lateMcSheet.Cell(5, 4).Value = "Date";
            lateMcSheet.Cell(5, 5).Value = "Check In";
            lateMcSheet.Cell(5, 6).Value = "Late By";
            lateMcSheet.Cell(5, 7).Value = "Status";

            var lateMcHeader =
                lateMcSheet.Range(5, 1, 5, 7);

            lateMcHeader.Style.Font.Bold = true;
            lateMcHeader.Style.Fill.BackgroundColor =
                XLColor.Orange;

            lateMcHeader.Style.Font.FontColor =
                XLColor.White;

            int lateMcRow = 6;

            foreach (var item in lateMissedCheckoutEmployees)
            {
                var checkIn =
                    ConvertToIST(item.Attendance.Check_In.Value);

                var lateMinutes =
                    (int)(checkIn.TimeOfDay -
                          new TimeSpan(9, 15, 0))
                    .TotalMinutes;

                lateMcSheet.Cell(lateMcRow, 1).Value =
                    item.Employee.Employee_Id;

                lateMcSheet.Cell(lateMcRow, 2).Value =
                    item.Employee.Name;

                lateMcSheet.Cell(lateMcRow, 3).Value =
                    item.Employee.Department;

                lateMcSheet.Cell(lateMcRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                lateMcSheet.Cell(lateMcRow, 5).Value =
                    checkIn.ToString("hh:mm tt");

                lateMcSheet.Cell(lateMcRow, 6).Value =
                    $"{lateMinutes} Min";

                lateMcSheet.Cell(lateMcRow, 7).Value =
                    "MC";

                lateMcRow++;
            }

            lateMcSheet.Columns().AdjustToContents();


            //=====================================
            // LATE EMPLOYEES SHEET
            //=====================================

            lateSheet.Cell(1, 1).Value =

        "Late Employees Report";

            lateSheet.Cell(2, 1).Value =
                $"Report Date : {date:dd-MMM-yyyy}";

            lateSheet.Cell(3, 1).Value =
                $"Total Employees : {employees.Count}";

            lateSheet.Cell(3, 4).Value =
                $"Total Late : {lateEmployees.Count}";

            lateSheet.Cell(5, 1).Value = "Employee ID";
            lateSheet.Cell(5, 2).Value = "Employee Name";
            lateSheet.Cell(5, 3).Value = "Department";
            lateSheet.Cell(5, 4).Value = "Date";
            lateSheet.Cell(5, 5).Value = "Check In";
            lateSheet.Cell(5, 6).Value = "Late By";

            var lateHeader =

        lateSheet.Range(5, 1, 5, 6);

            lateHeader.Style.Font.Bold = true;
            lateHeader.Style.Fill.BackgroundColor =
                XLColor.DarkOrange;

            lateHeader.Style.Font.FontColor =
                XLColor.White;

            int lateRow = 6;

            foreach (var item in lateEmployees)
            {
                var checkInTime =
                    ConvertToIST(
                        item.Attendance.Check_In.Value);

                var lateMinutes =
                    (int)(checkInTime.TimeOfDay -
                    new TimeSpan(9, 15, 0))
                    .TotalMinutes;

                lateSheet.Cell(lateRow, 1).Value =
                    item.Employee.Employee_Id;

                lateSheet.Cell(lateRow, 2).Value =
                    item.Employee.Name;

                lateSheet.Cell(lateRow, 3).Value =
                    item.Employee.Department;

                lateSheet.Cell(lateRow, 4).Value =
                    date.ToString("dd-MMM-yyyy");

                lateSheet.Cell(lateRow, 5).Value =
                    checkInTime.ToString("hh:mm tt");

                lateSheet.Cell(lateRow, 6).Value =
                    $"{lateMinutes} Min";

                lateRow++;
            }

            lateSheet.Columns()
                .AdjustToContents();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }
        private void ApplyStatusColor(IXLCell cell, string status)
        {
            status = status?.Trim();

            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            cell.Style.Border.OutsideBorderColor = XLColor.LightGray;

            cell.Style.Font.FontColor = XLColor.Black;

            switch (status)
            {
                case "Present":
                case "P":
                case "Late":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#DFF6DD");
                    cell.Value = "P";
                    break;

                case "Absent":
                case "A":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FDE2E1");
                    cell.Value = "A";
                    break;

                case "Half Day":
                case "HD":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CC");
                    cell.Value = "HD";
                    break;

                case "W":
                case "Weekend":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Value = "W";
                    break;

                case "H":
                case "Holiday":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#DCEBFF");
                    cell.Value = "H";
                    break;

                case "L":
                case "On Leave":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E9D5FF");
                    cell.Value = "L";
                    break;

                case "LOP":
                case "Loss Of Pay":
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFB3B3");
                    cell.Value = "LOP";
                    break;

                default:
                    cell.Style.Fill.BackgroundColor = XLColor.White;
                    break;
            }
        }
    }
}




