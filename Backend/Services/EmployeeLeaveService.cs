using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenXmlPowerTools;
using System.Security.Claims;

public class EmployeeLeaveService : IEmployeeLeaveService

{



    private readonly AppDbContext _context;

    private readonly IAdminNotificationService _notificationService;
    private readonly IEmailService _emailService;
    private readonly ILeaveBalanceService _leaveBalanceService;
    public EmployeeLeaveService(
     AppDbContext context,
     IAdminNotificationService notificationService,
     IEmailService emailService,
     ILeaveBalanceService leaveBalanceService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
        _leaveBalanceService = leaveBalanceService;
    }

    private LeaveSettings GetLeaveSettings()
    {
        var settings = _context.LeaveSettings
            .AsNoTracking()
            .FirstOrDefault();

        if (settings == null)
            throw new Exception("Leave Settings not configured.");

        return settings;
    }

    private NotificationSettings GetNotificationSettings()
    {
        var settings = _context.NotificationSettings
            .AsNoTracking()
            .FirstOrDefault();

        if (settings == null)
            throw new Exception("Notification Settings not configured.");

        return settings;
    }

    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto, ClaimsPrincipal user)

    {

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees

            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)

            return new BadRequestObjectResult(new { message = "Employee not found" });

        var fromDate = dto.FromDate.Date;
        var toDate = dto.ToDate.Date;

        var today = DateTime.Today;

        // 1. From Date cannot be after To Date
        if (fromDate > toDate)
        {
            return new BadRequestObjectResult(new
            {
                message = "From date cannot be greater than To date"
            });
        }

        // 2. Do not allow previous dates
        if (fromDate < today)
        {
            return new BadRequestObjectResult(new
            {
                message = "Leave cannot be applied for previous dates."
            });
        }

        var alreadyApplied = await _context.EmployeeLeaves

            .AsNoTracking()

            .AnyAsync(l =>

                l.EmployeeId == employee.Employee_Id &&

                l.Status != "Rejected" &&

                l.Status != "Cancelled" &&

                fromDate <= l.ToDate.Date &&

                toDate >= l.FromDate.Date

            );

        if (alreadyApplied)

            return new BadRequestObjectResult(new

            {

                message = "You already applied leave for this date"

            });

        int workingDays = await CalculateSandwichLeaveDays(

     employee.Employee_Id,

     fromDate,

     toDate);

        if (workingDays == 0)

        {

            return new BadRequestObjectResult(new

            {

                message = "Leave cannot be applied for weekends or holidays"

            });

        }

        var approvalToken = Guid.NewGuid().ToString();

        var leave = new EmployeeLeave

        {

            EmployeeId = employee.Employee_Id,

            EmployeeName = employee.Name,

            LeaveType = dto.LeaveType,

            RequestedType = "Leave",
            ApprovedType = null,
            ApprovalRemarks = null,

            FromDate = fromDate,

            ToDate = toDate,

            Reason = dto.Reason,

            Status = "Pending",

            ManagerStatus = "Pending",

            HRStatus = "Pending",

            ApprovalToken = approvalToken,


            CreatedAt = DateTime.UtcNow

        };

        await _context.EmployeeLeaves.AddAsync(leave);

        await _context.SaveChangesAsync();

        var leaveSettings = GetLeaveSettings();

        var approvalRoles = leaveSettings.ApprovalRoles
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim().ToLower())
            .ToList();

        var approvers = await _context.Employees
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.RoleName) &&
                approvalRoles.Contains(x.RoleName.ToLower()))
            .ToListAsync();

        var internalEmails = approvers

    .Where(x => !string.IsNullOrWhiteSpace(x.Email))

    .Select(x => x.Email.Trim().ToLower())

    .Distinct()

    .ToList();

        var externalEmails = leaveSettings.ExternalEmails?
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? new List<string>();

        string baseUrl = "https://localhost:7191";
        var notification = GetNotificationSettings();

        if (!notification.EnableEmailNotifications ||
            !notification.EnableLeaveEmails)
        {
            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "Leave Request",
                Message = $"{employee.Name} applied for leave",
                UserRole = "Manager",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new OkObjectResult(new
            {
                message = "Leave applied successfully"
            });
        }

        foreach (var approver in approvers)

        {

            if (!string.IsNullOrWhiteSpace(approver.Email))

            {

                await _emailService.SendEmailAsync(

approver.Email,

$"Leave Approval Request - {employee.Name} ({employee.Employee_Id}) - #{leave.Id}",

$@"
<html>
<body style='font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;'>
<p>Hi Team,</p>
<p>Hope you are doing well!!</p>
<p>

With reference to the above subject, employee
<b>{employee.Name} ({employee.Employee_Id})</b>

has applied for <b>{dto.LeaveType}</b> from
<b>{fromDate:dd-MMM-yyyy}</b> to
<b>{toDate:dd-MMM-yyyy}</b>.
</p>
<p>
<b>Applied On:</b>

{leave.CreatedAt.ToLocalTime():dd-MMM-yyyy hh:mm:ss tt}
</p>
<p>
<b>Reason:</b> {dto.Reason}
</p>
<p>

We kindly request you to review the leave application and provide your approval/rejection at the earliest.
</p>
<p>

NOTE: Please log in to the EMS application using the link below:
</p>
<p>
<a href='https://hrms.pirnav.com/login' target='_blank'>

EMS Login Portal
</a>
</p>
<p>

Or copy and paste the URL into your browser:
<br/>
<b>https://hrms.pirnav.com/login</b>
</p>
<p>

After logging in, navigate to:
<br/>
<b>Leave Management → Pending Requests</b>
</p>
<p>

to take the necessary action.
</p>
<p>

Thank you for your understanding and support.
</p>
<p>

Thank you,
</p>
<p>

Regards,
</p>
<p>
<b>PIRNAV EMS</b><br/>

Employee Management System<br/>

Pirnav Software Solutions Pvt. Ltd.<br/>
</p>
</body>
</html>"

);

            }

        }

        if (externalEmails != null && externalEmails.Any())
        {
            foreach (var externalEmail in externalEmails)
            {
                // ============================================================
                // APPROVE AS LEAVE URL
                // ============================================================

                var approveAsLeaveLink =
      $"{baseUrl}/api/EmployeeLeave/mail-action?leaveId={leave.Id}&action=ApproveAsLeave&token={approvalToken}&approverEmail={externalEmail}";

                var approveAsWFHLink =
                    $"{baseUrl}/api/EmployeeLeave/mail-action?leaveId={leave.Id}&action=ApproveAsWFH&token={approvalToken}&approverEmail={externalEmail}";

                var rejectLink =
                    $"{baseUrl}/api/EmployeeLeave/mail-action?leaveId={leave.Id}&action=Reject&token={approvalToken}&approverEmail={externalEmail}";

                await _emailService.SendEmailAsync(

                    externalEmail,

                    $"Leave Approval Required - {employee.Name} - Leave #{leave.Id}",

                    $@"
<html>

<body style='font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;'>

<p>Hi Team,</p>

<p>Hope you are doing well!!</p>

<p>
With reference to the above subject, employee
<b>{employee.Name} ({employee.Employee_Id})</b>
has applied for <b>{dto.LeaveType}</b> from
<b>{fromDate:dd-MMM-yyyy}</b> to
<b>{toDate:dd-MMM-yyyy}</b>.
</p>

<p>
<b>Applied On:</b>
{leave.CreatedAt.ToLocalTime():dd-MMM-yyyy hh:mm:ss tt}
</p>

<p>
<b>Reason:</b> {dto.Reason}
</p>

<p>
We kindly request you to review the leave application
and provide your approval/rejection.
</p>

<br/>

<!-- ========================================================= -->
<!-- APPROVE AS LEAVE -->
<!-- ========================================================= -->

<a href='{approveAsLeaveLink}'
style='background-color:green;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;'>
Approve as Leave
</a>

<a href='{approveAsWFHLink}'
style='background-color:#007bff;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;'>
Approve as WFH
</a>

<a href='{rejectLink}'
style='background-color:red;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;'>
Reject
</a>
<br/>
<br/>

<p>Thank you,</p>

<p>
Regards,<br/>
<b>PIRNAV EMS</b><br/>
Employee Management System
</p>

</body>

</html>"
                );
            }
        }

        _context.AdminNotifications.Add(new AdminNotification
        {
            Title = "Leave Request",

            Message = $"{employee.Name} applied for leave",

            UserRole = "Manager",

            IsRead = false,

            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new OkObjectResult(new
        {
            message = "Leave applied successfully"
        });
    }


    private async Task UpdateAttendanceForApprovedLeave(
    EmployeeLeave leave,
    int paidLeaveDays,
    int lopDays)
    {
        var currentDate = leave.FromDate.Date;

        while (currentDate <= leave.ToDate.Date)
        {
            // Skip weekends
            if (currentDate.DayOfWeek == DayOfWeek.Saturday ||
                currentDate.DayOfWeek == DayOfWeek.Sunday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            // Skip holidays
            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == currentDate);

            if (isHoliday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == leave.EmployeeId &&
                    a.Attendance_Date.Date == currentDate);

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = leave.EmployeeId,
                    Attendance_Date = currentDate
                };

                _context.Attendance.Add(attendance);
            }

            if (paidLeaveDays > 0)
            {
                attendance.Status = "OL";
                paidLeaveDays--;
            }
            else if (lopDays > 0)
            {
                attendance.Status = "LOP";
                lopDays--;
            }

            currentDate = currentDate.AddDays(1);
        }

        await _context.SaveChangesAsync();
    }

    private async Task UpdateAttendanceForApprovedWFH(
    EmployeeLeave leave)
    {
        var currentDate = leave.FromDate.Date;

        while (currentDate <= leave.ToDate.Date)
        {
            // Skip Saturday and Sunday
            if (currentDate.DayOfWeek == DayOfWeek.Saturday ||
                currentDate.DayOfWeek == DayOfWeek.Sunday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            // Skip holidays
            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == currentDate);

            if (isHoliday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == leave.EmployeeId &&
                    a.Attendance_Date.Date == currentDate);

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = leave.EmployeeId,
                    Attendance_Date = currentDate
                };

                _context.Attendance.Add(attendance);
            }

            // Final approved type is WFH
            attendance.Status = "WFH";

            currentDate = currentDate.AddDays(1);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<IActionResult> UpdateStatus(
     LeaveApprovalDto dto,
     ClaimsPrincipal user)
    {
        var leave = await _context.EmployeeLeaves
    .FirstOrDefaultAsync(x => x.Id == dto.RequestId);

        if (leave == null)
            return new NotFoundObjectResult("Leave not found");

        if (leave.Status != null &&
            leave.Status.StartsWith("Approved"))
        {
            return new BadRequestObjectResult("Already approved");
        }

        if (leave.Status == "Rejected")
        {
            return new BadRequestObjectResult("Already rejected");
        }

        if (dto.Decision != "ApproveAsLeave" &&
            dto.Decision != "ApproveAsWFH" &&
            dto.Decision != "Reject")
        {
            return new BadRequestObjectResult(
                "Invalid approval decision.");
        }

        // Existing approver identification continues below...
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        string approverName = "";

        // ----------------------------------------------------
        // First check Employees
        // ----------------------------------------------------

        var loggedInEmployee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

        if (loggedInEmployee != null)
        {
            approverName = loggedInEmployee.Name;
        }
        else
        {
            // ------------------------------------------------
            // If not an employee, check Admins table
            // ------------------------------------------------

            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

            if (admin == null)
                return new UnauthorizedObjectResult("User not found");

            // If Admin table has Name column
            // approverName = admin.Name;

            // Otherwise use email
            approverName = admin.Email?
     .Split('@')[0]
     .Trim();
        }

        // Take only first name
        approverName = approverName
            .Trim()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault() ?? approverName;
        //var role = loggedInUser.RoleName?.Trim();

        ////if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
        ////    !string.Equals(role, "HR", StringComparison.OrdinalIgnoreCase))
        ////{
        ////    return new BadRequestObjectResult(
        ////        "Only Manager or HR can approve leave");
        ////}
        //Console.WriteLine($"Original Name = {approver.Name}");
        //Console.WriteLine($"First Name = {approverName}");

        //// Save approver details


        leave.ApprovedBy = approverName;
        leave.ApprovedOn = DateTime.UtcNow;

        leave.ApprovalRemarks = dto.ApprovalRemarks;
        //if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase))
        //{
        //    leave.ManagerStatus = status;
        //}

        //if (string.Equals(role, "HR", StringComparison.OrdinalIgnoreCase))
        //{
        //    leave.HRStatus = status;
        //}
        var employee = await _context.Employees
    .FirstOrDefaultAsync(x => x.Employee_Id == leave.EmployeeId);
        if (dto.Decision == "ApproveAsLeave")
        {
            leave.Status = $"Approved By {approverName}";
            leave.ApprovedType = "Leave";
            leave.LeaveType = leave.ApprovedType;
            if (employee == null)
            {
                return new BadRequestObjectResult(
                    "Employee not found.");
            }

            DateTime joiningDate = employee.JoiningDate.Date;

            // 6 months probation
            DateTime probationEndDate = joiningDate.AddMonths(6);


            // =====================================================
            // CASE 1: ENTIRE LEAVE IS DURING PROBATION
            // =====================================================

            if (leave.ToDate.Date < probationEndDate)
            {
                int lopDays = await CalculateLeaveDaysForProbation(
                    leave.FromDate,
                    leave.ToDate);

                leave.PaidLeaveDays = 0;
                leave.LOPDays = lopDays;

                await UpdateAttendanceForApprovedLeave(
                    leave,
                    0,
                    lopDays);
            }

            // =====================================================
            // CASE 2: LEAVE CROSSES PROBATION END DATE
            // Example:
            // Probation ends Aug 10
            // Leave Aug 8 - Aug 12
            // Aug 8-9 = LOP
            // Aug 10-12 = normal leave policy
            // =====================================================

            else if (leave.FromDate.Date < probationEndDate &&
                     leave.ToDate.Date >= probationEndDate)
            {
                DateTime probationLeaveEnd =
                    probationEndDate.AddDays(-1);

                int probationLopDays =
                    await CalculateLeaveDaysForProbation(
                        leave.FromDate,
                        probationLeaveEnd);

                // Normal leave starts from probation completion date
                var originalFromDate = leave.FromDate;

                leave.FromDate = probationEndDate;

                var result =
                    await _leaveBalanceService.ApproveLeaveAsync(leave);

                // Restore original leave date
                leave.FromDate = originalFromDate;

                leave.PaidLeaveDays =
                    result.PaidLeaves;

                leave.LOPDays =
                    probationLopDays + result.LopDays;

                // We will handle attendance separately below
                await UpdateProbationCrossingLeaveAttendance(
                    leave,
                    probationEndDate,
                    result.PaidLeaves,
                    result.LopDays);
            }

            // =====================================================
            // CASE 3: PROBATION ALREADY COMPLETED
            // Existing logic
            // =====================================================

            else
            {
                var result =
                    await _leaveBalanceService.ApproveLeaveAsync(leave);

                leave.PaidLeaveDays =
                    result.PaidLeaves;

                leave.LOPDays =
                    result.LopDays;

                await UpdateAttendanceForApprovedLeave(
                    leave,
                    result.PaidLeaves,
                    result.LopDays);
            }


            // Continue your existing notification code here...
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = leave.EmployeeId,
                Title = "Leave Approved",
                Message = $"Your leave request has been approved by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Fixed email addresses
            var leaveSettings = GetLeaveSettings();

            var emailList = leaveSettings.ExternalEmails?
                .Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();

            // Fetch all HR, HRAdmin and Manager emails from database
            var approvalRoles = leaveSettings.ApprovalRoles
    .Split(',', StringSplitOptions.RemoveEmptyEntries)
    .Select(x => x.Trim().ToLower())
    .ToList();

            var roleEmails = await _context.Employees
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x.Email) &&
                    !string.IsNullOrWhiteSpace(x.RoleName) &&
                    approvalRoles.Contains(x.RoleName.ToLower()))
                .Select(x => x.Email)
                .ToListAsync();

            // Add role emails
            emailList.AddRange(roleEmails);

            // Add employee email
            if (employee != null && !string.IsNullOrWhiteSpace(employee.Email))
            {
                emailList.Add(employee.Email);
            }

            // Remove duplicate email IDs
            emailList = emailList
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            string body = $@"
<h3>Leave Request Approved</h3>

<p>Dear Team,</p>

<p>The following leave request has been approved.</p>

<table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
    <tr>
        <td><b>Employee Name</b></td>
        <td>{leave.EmployeeName}</td>
    </tr>
    <tr>
        <td><b>Employee ID</b></td>
        <td>{leave.EmployeeId}</td>
    </tr>
    <tr>
        <td><b>Leave Type</b></td>
        <td>{leave.LeaveType}</td>
    </tr>
    <tr>
        <td><b>From Date</b></td>
        <td>{leave.FromDate:dd-MMM-yyyy}</td>
    </tr>
    <tr>
        <td><b>To Date</b></td>
        <td>{leave.ToDate:dd-MMM-yyyy}</td>
    </tr>
    <tr>
        <td><b>Reason</b></td>
        <td>{leave.Reason}</td>
    </tr>
    <tr>
        <td><b>Approved By</b></td>
        <td>{approverName}</td>
    </tr>
    <tr>
        <td><b>Approved On</b></td>
        <td>{DateTime.Now:dd-MMM-yyyy hh:mm tt}</td>
    </tr>
</table>

<br/>

<p>Regards,<br/>EMS Team</p>";

            // Send email to everyone

            var notification = GetNotificationSettings();

            if (notification.EnableEmailNotifications &&
                notification.EnableLeaveEmails)
            {

                foreach (var mail in emailList)
                {
                    try
                    {
                        await _emailService.SendEmailAsync(
                            mail,
                            "Leave Approved",
                            body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to send email to {mail}: {ex.Message}");
                    }
                }
            }

            //await RecalculateLeaveBalance(leave.EmployeeId);

            return new OkObjectResult($"Leave approved by {approverName}");
        }
        else if (dto.Decision == "ApproveAsWFH")
        {
            leave.Status = $"Approved As WFH By {approverName}";
            leave.ApprovedType = "WFH";
            leave.LeaveType = leave.ApprovedType;

            await UpdateAttendanceForApprovedWFH(leave);

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = leave.EmployeeId,
                Title = "Work From Home Approved",
                Message = $"Your request has been approved as Work From Home by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new OkObjectResult(
                $"Request approved as Work From Home by {approverName}");
        }
        else
        {
            // ============================================================
            // 3. REJECT LEAVE
            // ============================================================

            leave.Status = $"Rejected By {approverName}";
            leave.ApprovedType = null;

            await _context.SaveChangesAsync();

            // Fixed email addresses
            var leaveSettings = GetLeaveSettings();

            var emailList = leaveSettings.ExternalEmails?
                .Split(';', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();

            // Fetch all HR, HRAdmin and Manager emails
            var approvalRoles = leaveSettings.ApprovalRoles
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim().ToLower())
                .ToList();

            var roleEmails = await _context.Employees
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x.Email) &&
                    !string.IsNullOrWhiteSpace(x.RoleName) &&
                    approvalRoles.Contains(x.RoleName.ToLower()))
                .Select(x => x.Email)
                .ToListAsync();

            emailList.AddRange(roleEmails);

            // Add employee email
            if (employee != null &&
                !string.IsNullOrWhiteSpace(employee.Email))
            {
                emailList.Add(employee.Email);
            }

            emailList = emailList
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            string body = $@"
<h3>Leave Request Rejected</h3>

<p>Dear Team,</p>

<p>The following leave request has been rejected.</p>

<table border='1'
       cellpadding='8'
       cellspacing='0'
       style='border-collapse:collapse;'>

<tr>
<td><b>Employee Name</b></td>
<td>{leave.EmployeeName}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{leave.EmployeeId}</td>
</tr>

<tr>
<td><b>Leave Type</b></td>
<td>{leave.LeaveType}</td>
</tr>

<tr>
<td><b>From Date</b></td>
<td>{leave.FromDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>To Date</b></td>
<td>{leave.ToDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>Reason</b></td>
<td>{leave.Reason}</td>
</tr>

<tr>
<td><b>Rejected By</b></td>
<td>{approverName}</td>
</tr>

<tr>
<td><b>Rejected On</b></td>
<td>{DateTime.Now:dd-MMM-yyyy hh:mm tt}</td>
</tr>

</table>

<br/>

<p>Regards,<br/>EMS Team</p>";

            var notification = GetNotificationSettings();

            if (notification.EnableEmailNotifications &&
                notification.EnableLeaveEmails)
            {
                foreach (var mail in emailList)
                {
                    try
                    {
                        await _emailService.SendEmailAsync(
                            mail,
                            "Leave Rejected",
                            body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine(
                            $"Failed to send email to {mail}: {ex.Message}");
                    }
                }
            }

            return new OkObjectResult(
                $"Leave rejected by {approverName}");
        }
    }
    private async Task<int> CalculateLeaveDaysForProbation(
    DateTime fromDate,
    DateTime toDate)
    {
        int lopDays = 0;

        for (DateTime date = fromDate.Date;
             date <= toDate.Date;
             date = date.AddDays(1))
        {
            // Skip weekends
            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
            {
                continue;
            }

            // Skip holidays
            bool isHoliday = await _context.Holidays
                .AnyAsync(h =>
                    h.Holiday_Date.Date == date.Date);

            if (isHoliday)
            {
                continue;
            }

            lopDays++;
        }

        return lopDays;
    }

    private async Task UpdateProbationCrossingLeaveAttendance(
    EmployeeLeave leave,
    DateTime probationEndDate,
    int paidLeaveDays,
    int normalLopDays)
    {
        var currentDate = leave.FromDate.Date;

        while (currentDate <= leave.ToDate.Date)
        {
            // Skip weekends
            if (currentDate.DayOfWeek == DayOfWeek.Saturday ||
                currentDate.DayOfWeek == DayOfWeek.Sunday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            // Skip holidays
            bool isHoliday = await _context.Holidays
                .AnyAsync(h =>
                    h.Holiday_Date.Date == currentDate);

            if (isHoliday)
            {
                currentDate = currentDate.AddDays(1);
                continue;
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == leave.EmployeeId &&
                    a.Attendance_Date.Date == currentDate);

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = leave.EmployeeId,
                    Attendance_Date = currentDate
                };

                _context.Attendance.Add(attendance);
            }


            // ==============================================
            // BEFORE PROBATION COMPLETION
            // ==============================================

            if (currentDate < probationEndDate)
            {
                attendance.Status = "LOP";
            }

            // ==============================================
            // AFTER PROBATION COMPLETION
            // ==============================================

            else
            {
                if (paidLeaveDays > 0)
                {
                    attendance.Status = "OL";
                    paidLeaveDays--;
                }
                else if (normalLopDays > 0)
                {
                    attendance.Status = "LOP";
                    normalLopDays--;
                }
            }

            currentDate = currentDate.AddDays(1);
        }

        await _context.SaveChangesAsync();
    }
    public async Task<IActionResult> GetAllLeaves()
    {
        var today = DateTime.Today;

        var leaves = await _context.EmployeeLeaves
            .OrderByDescending(x =>
                x.Status.StartsWith("Approved") &&
                x.FromDate.Date <= today &&
                x.ToDate.Date >= today)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.EmployeeId,
                x.EmployeeName,
                x.LeaveType,
                x.FromDate,
                x.ToDate,
                x.Reason,
                x.Status,

                x.ApprovedBy,

                AppliedDate = x.CreatedAt,
                ApprovedDate = x.ApprovedOn
            })
            .ToListAsync();

        return new OkObjectResult(leaves);
    }
    public async Task<IActionResult> GetMyLeaves(ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
        {
            return new BadRequestObjectResult("Employee not found");
        }

        var today = DateTime.Today;

        var leaves = await _context.EmployeeLeaves
            .Where(l => l.EmployeeId == employee.Employee_Id)
            .OrderByDescending(l =>
                l.Status.StartsWith("Approved") &&
                l.FromDate.Date <= today &&
                l.ToDate.Date >= today)
            .ThenByDescending(l => l.CreatedAt)
            .ToListAsync();

        return new OkObjectResult(leaves);
    }

    //public async Task<IActionResult> GetBalance(ClaimsPrincipal user)

    //{

    //    // STEP 1: GET EMAIL FROM TOKEN

    //    var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

    //    if (string.IsNullOrEmpty(email))

    //        return new UnauthorizedObjectResult("Invalid token");

    //    // STEP 2: GET EMPLOYEE

    //    var employee = await _context.Employees

    //    .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

    //    if (employee == null)

    //        return new BadRequestObjectResult("Employee not found");

    //    // STEP 3: GET LEAVE BALANCE

    //    var balance = await _context.EmployeeLeaveBalances

    //        .FirstOrDefaultAsync(b => b.Employee_Id == employee.Employee_Id);

    //    if (balance == null)

    //    {

    //        balance = new EmployeeLeaveBalance

    //        {

    //            Employee_Id = employee.Employee_Id

    //            // totals will use DB default values

    //        };

    //        _context.EmployeeLeaveBalances.Add(balance);

    //        await _context.SaveChangesAsync();

    //    }

    //    // STEP 4: RETURN DATA

    //    return new OkObjectResult(new

    //    {

    //        Earned = new

    //        {

    //            Total = balance.Earned_Total,

    //            Used = balance.Earned_Used,

    //            Remaining = balance.Earned_Total - balance.Earned_Used

    //        },

    //        Casual = new

    //        {

    //            Total = balance.Casual_Total,

    //            Used = balance.Casual_Used,

    //            Remaining = balance.Casual_Total - balance.Casual_Used

    //        },

    //        Sick = new

    //        {

    //            Total = balance.Sick_Total,

    //            Used = balance.Sick_Used,

    //            Remaining = balance.Sick_Total - balance.Sick_Used

    //        }

    //    });

    //}

    public async Task<IActionResult> GetEmployeeLeaveDetails(string employeeId)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (employee == null)
            return new NotFoundObjectResult("Employee not found");

        //var balance = await _context.EmployeeLeaveBalances
        //    .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        //if (balance == null)
        //{
        //    balance = new EmployeeLeaveBalance
        //    {
        //        Employee_Id = employeeId
        //    };

        //    _context.EmployeeLeaveBalances.Add(balance);
        //    await _context.SaveChangesAsync();
        //}

        var leaveHistory = await _context.EmployeeLeaves
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.LeaveType,
                x.FromDate,
                x.ToDate,
                x.Reason,
                x.Status,
                x.ApprovedBy,
                x.ApprovedOn,
                x.CreatedAt
            })
            .ToListAsync();

        return new OkObjectResult(new
        {
            EmployeeId = employee.Employee_Id,
            EmployeeName = employee.Name,
            Department = employee.Department,
            Email = employee.Email,

            //LeaveBalance = new
            //{
            //    Earned = new
            //    {
            //        Total = balance.Earned_Total,
            //        Used = balance.Earned_Used,
            //        Remaining = balance.Earned_Total - balance.Earned_Used
            //    },

            //    Casual = new
            //    {
            //        Total = balance.Casual_Total,
            //        Used = balance.Casual_Used,
            //        Remaining = balance.Casual_Total - balance.Casual_Used
            //    },

            //    Sick = new
            //    {
            //        Total = balance.Sick_Total,
            //        Used = balance.Sick_Used,
            //        Remaining = balance.Sick_Total - balance.Sick_Used
            //    }
            //},

            TotalLeavesApplied = leaveHistory.Count,

            LeaveHistory = leaveHistory
        });
    }
    public async Task<byte[]> ExportLeavesExcel()
    {
        var leaves = await _context.EmployeeLeaves
            .AsNoTracking()
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Employee Leaves");

        // Headers
        worksheet.Cell(1, 1).Value = "Employee ID";
        worksheet.Cell(1, 2).Value = "Employee Name";
        worksheet.Cell(1, 3).Value = "Leave Type";
        worksheet.Cell(1, 4).Value = "From Date";
        worksheet.Cell(1, 5).Value = "To Date";
        worksheet.Cell(1, 6).Value = "Reason";
        worksheet.Cell(1, 7).Value = "Status";
        worksheet.Cell(1, 8).Value = "Applied On";

        var headerRange = worksheet.Range(1, 1, 1, 8);
        headerRange.Style.Font.Bold = true;

        int row = 2;

        foreach (var leave in leaves)
        {
            worksheet.Cell(row, 1).Value = leave.EmployeeId;
            worksheet.Cell(row, 2).Value = leave.EmployeeName;
            worksheet.Cell(row, 3).Value = leave.LeaveType;
            worksheet.Cell(row, 4).Value = leave.FromDate;
            worksheet.Cell(row, 5).Value = leave.ToDate;
            worksheet.Cell(row, 6).Value = leave.Reason;
            worksheet.Cell(row, 7).Value = leave.Status;
            worksheet.Cell(row, 8).Value = leave.CreatedAt;

            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return stream.ToArray();
    }


    public async Task<IActionResult> Delete(int id)

    {

        var leave = await _context.EmployeeLeaves.FindAsync(id);

        if (leave == null)

            return new NotFoundObjectResult("Leave not found");

        _context.EmployeeLeaves.Remove(leave);

        await _context.SaveChangesAsync();

        return new OkObjectResult("Leave deleted");

    }
    public async Task<IActionResult> CancelLeave(int id, ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
            return new BadRequestObjectResult("Employee not found");

        var leave = await _context.EmployeeLeaves
            .FirstOrDefaultAsync(l => l.Id == id &&
                                      l.EmployeeId == employee.Employee_Id);

        if (leave == null)
            return new NotFoundObjectResult("Leave not found");

        // Already cancelled
        if (leave.Status != null &&
            leave.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult("Leave is already cancelled.");
        }

        // Already rejected
        if (leave.Status != null &&
            leave.Status.StartsWith("Rejected", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult("Rejected leave cannot be cancelled.");
        }

        // Already approved
        if (leave.Status != null &&
            leave.Status.StartsWith("Approved", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult("Approved leave cannot be cancelled.");
        }

        // Only pending leave can be cancelled
        leave.Status = "Cancelled";
        leave.ManagerStatus = "Cancelled";
        leave.HRStatus = "Cancelled";
        leave.ApprovedBy = null;
        leave.ApprovedOn = null;
        leave.PaidLeaveDays = 0;
        leave.LOPDays = 0;

        await _context.SaveChangesAsync();

        return new OkObjectResult("Leave cancelled successfully.");
    }
    private async Task<int> CalculateWorkingDays(DateTime fromDate, DateTime toDate)
    {
        int days = 0;

        for (var date = fromDate.Date; date <= toDate.Date; date = date.AddDays(1))
        {
            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
                continue;

            var isHoliday = await _context.Holidays
                .AnyAsync(h => h.Holiday_Date.Date == date.Date);

            if (isHoliday)
                continue;

            days++;
        }

        return days;
    }

    private async Task<int> CalculateSandwichLeaveDays(
    string employeeId,
    DateTime fromDate,
    DateTime toDate)
    {
        // CASE 1:
        // Count ALL days inside the selected leave range
        // (including weekends and holidays)

        int leaveDays = (toDate.Date - fromDate.Date).Days + 1;

        // CASE 2:
        // Check previous approved leave
        var previousLeave = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
              x.Status.StartsWith("Approved") &&
                x.ToDate.Date < fromDate.Date)
            .OrderByDescending(x => x.ToDate)
            .FirstOrDefaultAsync();

        if (previousLeave != null)
        {
            var gapStart = previousLeave.ToDate.Date.AddDays(1);
            var gapEnd = fromDate.Date.AddDays(-1);

            if (gapStart <= gapEnd)
            {
                bool sandwichGap = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    bool isWeekend =
                        d.DayOfWeek == DayOfWeek.Saturday ||
                        d.DayOfWeek == DayOfWeek.Sunday;

                    bool isHoliday = await _context.Holidays
                        .AnyAsync(h => h.Holiday_Date.Date == d.Date);

                    if (!isWeekend && !isHoliday)
                    {
                        sandwichGap = false;
                        break;
                    }
                }

                if (sandwichGap)
                {
                    leaveDays += (gapEnd - gapStart).Days + 1;
                }
            }
        }

        // CASE 3:
        // Check next approved leave
        var nextLeave = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
               x.Status.StartsWith("Approved") &&
                x.FromDate.Date > toDate.Date)
            .OrderBy(x => x.FromDate)
            .FirstOrDefaultAsync();

        if (nextLeave != null)
        {
            var gapStart = toDate.Date.AddDays(1);
            var gapEnd = nextLeave.FromDate.Date.AddDays(-1);

            if (gapStart <= gapEnd)
            {
                bool sandwichGap = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    bool isWeekend =
                        d.DayOfWeek == DayOfWeek.Saturday ||
                        d.DayOfWeek == DayOfWeek.Sunday;

                    bool isHoliday = await _context.Holidays
                        .AnyAsync(h => h.Holiday_Date.Date == d.Date);

                    if (!isWeekend && !isHoliday)
                    {
                        sandwichGap = false;
                        break;
                    }
                }

                if (sandwichGap)
                {
                    leaveDays += (gapEnd - gapStart).Days + 1;
                }
            }
        }

        return leaveDays;
    }
    //private async Task RecalculateLeaveBalance(string employeeId)
    //{
    //    var balance = await _context.EmployeeLeaveBalances
    //        .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

    //    if (balance == null)
    //        return;

    //    balance.Casual_Used = 0;
    //    balance.Sick_Used = 0;
    //    balance.Earned_Used = 0;

    //    var approvedLeaves = await _context.EmployeeLeaves
    //        .Where(x =>
    //            x.EmployeeId == employeeId &&
    //            x.Status.StartsWith("Approved"))
    //        .ToListAsync();

    //    foreach (var leave in approvedLeaves)
    //    {
    //        int days = await CalculateSandwichLeaveDays(
    //            employeeId,
    //            leave.FromDate,
    //            leave.ToDate);

    //        switch (leave.LeaveType?.Trim().ToLower())
    //        {
    //            case "casual":
    //                balance.Casual_Used += days;
    //                break;

    //            case "sick":
    //                balance.Sick_Used += days;
    //                break;

    //            case "earned":
    //            case "earned leave":
    //                balance.Earned_Used += days;
    //                break;
    //        }
    //    }

    //    await _context.SaveChangesAsync();
    //}
    public async Task<IActionResult> ApplyWFH(
      WorkFromHomeDto dto,
      ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
        {
            return new BadRequestObjectResult(new
            {
                message = "Employee not found"
            });
        }

        var fromDate = dto.FromDate.Date;
        var toDate = dto.ToDate.Date;

        if (fromDate > toDate)
        {
            return new BadRequestObjectResult(new
            {
                message = "From Date cannot be greater than To Date."
            });
        }

        if (fromDate < DateTime.Today)
        {
            return new BadRequestObjectResult(new
            {
                message = "Cannot apply Work From Home for past dates."
            });
        }

        var alreadyApplied = await _context.WorkFromHomeRequests
            .AsNoTracking()
            .AnyAsync(x =>
                x.EmployeeId == employee.Employee_Id &&
                x.Status != "Rejected" &&
                x.Status != "Cancelled" &&
                fromDate <= x.ToDate.Date &&
                toDate >= x.FromDate.Date);

        if (alreadyApplied)
        {
            return new BadRequestObjectResult(new
            {
                message = "You have already applied Work From Home for these dates."
            });
        }

        var approvalToken = Guid.NewGuid().ToString();

        var wfh = new WorkFromHomeRequest
        {
            EmployeeId = employee.Employee_Id,
            EmployeeName = employee.Name,
            LeaveType = dto.LeaveType,
            FromDate = fromDate,
            ToDate = toDate,
            Reason = dto.Reason,
            Status = "Pending",
            ManagerStatus = "Pending",
            HRStatus = "Pending",
            ApprovalToken = approvalToken,
            AppliedOn = DateTime.UtcNow
        };

        await _context.WorkFromHomeRequests.AddAsync(wfh);
        await _context.SaveChangesAsync();

        //==========================================================
        // Dynamic Leave Settings
        //==========================================================

        var leaveSettings = GetLeaveSettings();

        var approvalRoles = leaveSettings.ApprovalRoles
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim().ToLower())
            .ToList();

        var approvers = await _context.Employees
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.RoleName) &&
                approvalRoles.Contains(x.RoleName.ToLower()))
            .ToListAsync();

        var internalEmails = approvers
            .Where(x => !string.IsNullOrWhiteSpace(x.Email))
            .Select(x => x.Email.Trim().ToLower())
            .Distinct()
            .ToList();

        var externalEmails = leaveSettings.ExternalEmails?
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList()
            ?? new List<string>();

        string baseUrl = "https://localhost:7191";

        var notification = GetNotificationSettings();

        if (!notification.EnableEmailNotifications ||
            !notification.EnableWFHEmails)
        {
            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "WFH Request",
                Message = $"{employee.Name} applied for Work From Home",
                UserRole = "Manager",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new OkObjectResult(new
            {
                message = "Work From Home applied successfully."
            });
        }
        //==========================================================
        // Internal Mail
        //==========================================================

        foreach (var approver in approvers)
        {
            if (!string.IsNullOrWhiteSpace(approver.Email))
            {
                await _emailService.SendEmailAsync(
                    approver.Email,
                    $"WFH Approval Request - {employee.Name} ({employee.Employee_Id}) - #{wfh.Id}",
    $@"
<html>
<body style='font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;'>

<p>Hi Team,</p>

<p>Hope you are doing well!!</p>

<p>
Employee
<b>{employee.Name} ({employee.Employee_Id})</b>
has applied for
<b>{dto.LeaveType}</b>
from
<b>{fromDate:dd-MMM-yyyy}</b>
to
<b>{toDate:dd-MMM-yyyy}</b>.
</p>

<p>
<b>Applied On:</b>
{wfh.AppliedOn?.ToLocalTime():dd-MMM-yyyy hh:mm:ss tt}</p>

<p>
<b>Reason:</b> {dto.Reason}
</p>

<p>
Kindly review the Work From Home request and take the necessary action.
</p>

<p>
Please login using the below link.
</p>

<p>
<a href='https://hrms.pirnav.com/login'>
EMS Login Portal
</a>
</p>

<p>
Or copy below URL:

<br/>

<b>https://hrms.pirnav.com/login</b>
</p>

<p>
Navigate to:

<br/>

<b>Work From Home → Pending Requests</b>
</p>

<p>
Thank you.
</p>

<p>
Regards,<br/>
<b>PIRNAV EMS</b><br/>
Employee Management System
</p>

</body>
</html>");
            }
        }

        //==========================================================
        // External Mail
        //==========================================================

        foreach (var externalEmail in externalEmails)
        {
            // ============================================================
            // APPROVE AS WFH
            // ============================================================

            var approveAsWFHLink =
     $"{baseUrl}/api/WorkFromHome/mail-action?requestId={wfh.Id}&action=ApproveAsWFH&token={approvalToken}&approverEmail={externalEmail}";

            var approveAsLeaveLink =
                $"{baseUrl}/api/WorkFromHome/mail-action?requestId={wfh.Id}&action=ApproveAsLeave&token={approvalToken}&approverEmail={externalEmail}";

            var rejectLink =
                $"{baseUrl}/api/WorkFromHome/mail-action?requestId={wfh.Id}&action=Reject&token={approvalToken}&approverEmail={externalEmail}";


            await _emailService.SendEmailAsync(

                externalEmail,

                $"WFH Approval Required - {employee.Name} - Request #{wfh.Id}",

                $@"
<html>
<body style='font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;'>

<p>Hi Team,</p>

<p>Hope you are doing well!!</p>

<p>
Employee
<b>{employee.Name} ({employee.Employee_Id})</b>
has applied for
<b>{dto.LeaveType}</b>
from
<b>{fromDate:dd-MMM-yyyy}</b>
to
<b>{toDate:dd-MMM-yyyy}</b>.
</p>

<p>
<b>Applied On:</b>
{wfh.AppliedOn?.ToLocalTime():dd-MMM-yyyy hh:mm:ss tt}
</p>

<p>
<b>Reason:</b> {dto.Reason}
</p>

<p>
Kindly review the Work From Home request and select the appropriate action.
</p>

<br/>

<a href='{approveAsWFHLink}'
style='background-color:green;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;'>
Approve as WFH
</a>

<a href='{approveAsLeaveLink}'
style='background-color:#007bff;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;margin-right:10px;display:inline-block;'>
Approve as Leave
</a>

<a href='{rejectLink}'
style='background-color:red;color:white;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;'>
Reject
</a>

<br/><br/>

<p>Thank you,</p>

<p>
Regards,<br/>
<b>PIRNAV EMS</b><br/>
Employee Management System
</p>

</body>
</html>"
            );
        }


        // ==========================================================
        // Admin Notification
        // ==========================================================

        _context.AdminNotifications.Add(new AdminNotification
        {
            Title = "WFH Request",

            Message = $"{employee.Name} applied for Work From Home",

            UserRole = "Manager",

            IsRead = false,

            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return new OkObjectResult(new
        {
            message = "Work From Home applied successfully."
        });
    }
    [HttpGet("all-wfh")]
    public async Task<IActionResult> GetAllWFH()
    {
        try
        {
            var requests = await _context.WorkFromHomeRequests
                .OrderByDescending(x => x.AppliedOn)
                .Select(x => new
                {
                    Id = x.Id,
                    EmployeeId = x.EmployeeId,
                    EmployeeName = x.EmployeeName,
                    LeaveType = x.LeaveType,

                    FromDate = x.FromDate,
                    ToDate = x.ToDate,

                    Reason = x.Reason,
                    Status = x.Status,

                    ApprovedBy = x.ApprovedBy,

                    // Handle null values
                    ApprovedOn = x.ApprovedOn == null
                        ? null
                        : x.ApprovedOn,

                    AppliedOn = x.AppliedOn == null
                        ? null
                        : x.AppliedOn
                })
                .ToListAsync();

            return new OkObjectResult(requests);
        }
        catch (Exception ex)
        {
            return new BadRequestObjectResult(new
            {
                Message = ex.Message,
                StackTrace = ex.StackTrace
            });

        }
    }
    public async Task<IActionResult> GetMyWFH(ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
            return new BadRequestObjectResult("Employee not found");

        var requests = await _context.WorkFromHomeRequests
            .Where(x => x.EmployeeId == employee.Employee_Id)
            .OrderByDescending(x => x.AppliedOn)
            .Select(x => new
            {
                x.Id,
                EmployeeId = x.EmployeeId,
                EmployeeName = x.EmployeeName,
                LeaveType = x.LeaveType,
                FromDate = x.FromDate,
                ToDate = x.ToDate,
                x.Reason,
                x.Status,
                x.ApprovedBy,
                x.ApprovedOn,
                x.AppliedOn
            })
            .ToListAsync();

        return new OkObjectResult(requests);
    }
    public async Task<IActionResult> UpdateWFHStatus(
        int id,
        string status,
        ClaimsPrincipal user)
    {
        var request = await _context.WorkFromHomeRequests
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request == null)
            return new NotFoundObjectResult("WFH request not found");


        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        string approverName = "";

        // Check Employees
        var loggedInEmployee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

        if (loggedInEmployee != null)
        {
            approverName = loggedInEmployee.Name;
        }
        else
        {
            // Check Admins
            var admin = await _context.Admins
                .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

            if (admin == null)
                return new UnauthorizedObjectResult("User not found");

            // show only before @
            approverName = admin.Email.Split('@')[0];
        }

        // Employee names -> first name only
        if (!approverName.Contains("@"))
        {
            approverName = approverName
                .Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault() ?? approverName;
        }
       
        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Employee_Id == request.EmployeeId);

        var leaveSettings = GetLeaveSettings();

        var emailList = leaveSettings.ExternalEmails?
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList()
            ?? new List<string>();

        var approvalRoles = leaveSettings.ApprovalRoles
     .Split(',', StringSplitOptions.RemoveEmptyEntries)
     .Select(x => x.Trim().ToLower())
     .ToList();

        var roleEmails = await _context.Employees
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.Email) &&
                !string.IsNullOrWhiteSpace(x.RoleName) &&
                approvalRoles.Contains(x.RoleName.ToLower()))
            .Select(x => x.Email)
            .ToListAsync();

        emailList.AddRange(roleEmails);

        if (employee != null && !string.IsNullOrWhiteSpace(employee.Email))
        {
            emailList.Add(employee.Email);
        }

        emailList = emailList
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (request.Status != null &&
    request.Status.StartsWith("Approved", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult("Already approved");
        }
        if (status.Equals("ApproveAsWFH", StringComparison.OrdinalIgnoreCase))
        {
            request.Status = $"Approved As WFH By {approverName}";

            request.ApprovedBy = approverName;
            request.ApprovedOn = DateTime.UtcNow;

            await UpdateAttendanceForApprovedWFHRequest(request);

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = request.EmployeeId,
                Title = "WFH Approved",
                Message = $"Your Work From Home request has been approved as WFH by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });


            await _context.SaveChangesAsync();

            string body = $@"
<h3>Work From Home Request Approved</h3>

<p>Dear Team,</p>

<p>The following Work From Home request has been approved.</p>

<table border='1' cellpadding='8' cellspacing='0'
style='border-collapse:collapse;'>

<tr>
<td><b>Employee Name</b></td>
<td>{request.EmployeeName}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{request.EmployeeId}</td>
</tr>

<tr>
<td><b>WFH Type</b></td>
<td>{request.LeaveType}</td>
</tr>

<tr>
<td><b>From Date</b></td>
<td>{request.FromDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>To Date</b></td>
<td>{request.ToDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>Reason</b></td>
<td>{request.Reason}</td>
</tr>

<tr>
<td><b>Approved By</b></td>
<td>{approverName}</td>
</tr>

<tr>
<td><b>Approved On</b></td>
<td>{DateTime.Now:dd-MMM-yyyy hh:mm tt}</td>
</tr>

</table>

<br/>

<p>Regards,<br/>EMS Team</p>";

            var notification = GetNotificationSettings();

            if (notification.EnableEmailNotifications &&
                notification.EnableWFHEmails)
            {

                foreach (var mail in emailList)
                {
                    try
                    {
                        await _emailService.SendEmailAsync(
                            mail,
                            "Work From Home Approved",
                            body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Email failed for {mail}: {ex.Message}");
                    }
                }
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult(
                $"Work From Home approved by {approverName}");
        }
        else if (status.Equals("ApproveAsLeave",
      StringComparison.OrdinalIgnoreCase))
        {
            // Approve WFH request as Leave

            if (employee == null)
            {
                return new BadRequestObjectResult(
                    "Employee not found.");
            }

            var existingLeave = await _context.EmployeeLeaves
                .FirstOrDefaultAsync(x =>
                    x.EmployeeId == request.EmployeeId &&
                    x.FromDate.Date == request.FromDate.Date &&
                    x.ToDate.Date == request.ToDate.Date &&
                    x.Status != "Rejected" &&
                    x.Status != "Cancelled");

            if (existingLeave != null)
            {
                return new BadRequestObjectResult(
                    "Leave already exists for these dates.");
            }

            var leave = new EmployeeLeave
            {
                EmployeeId = request.EmployeeId,
                EmployeeName = request.EmployeeName,

                LeaveType = "Leave",

                FromDate = request.FromDate,
                ToDate = request.ToDate,

                Reason = request.Reason,

                Status = "Approved",
                ManagerStatus = "Approved",
                HRStatus = "Approved",

                ApprovedBy = approverName,
                ApprovedOn = DateTime.UtcNow,

                AppliedDate = DateOnly.FromDateTime(
    request.AppliedOn ?? DateTime.UtcNow),

                ApprovalToken = request.ApprovalToken,

                CreatedAt = DateTime.UtcNow,

                PaidLeaveDays = 0,
                LOPDays = 0
            };

            var result =
                await _leaveBalanceService.ApproveLeaveAsync(leave);

            leave.PaidLeaveDays = result.PaidLeaves;
            leave.LOPDays = result.LopDays;

            await _context.EmployeeLeaves.AddAsync(leave);

            request.Status =
                $"Approved As Leave By {approverName}";

            request.ApprovedBy = approverName;
            request.ApprovedOn = DateTime.UtcNow;

            await UpdateAttendanceForApprovedLeave(
                leave,
                result.PaidLeaves,
                result.LopDays);

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = request.EmployeeId,

                Title = "WFH Request Approved As Leave",

                Message =
                    $"Your Work From Home request has been approved as Leave by {approverName}.",

                IsRead = false,

                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new OkObjectResult(
                $"WFH request approved as Leave by {approverName}");
        }
        else
        {
            request.Status = $"Rejected By {approverName}";

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = request.EmployeeId,
                Title = "WFH Rejected",
                Message = $"Your Work From Home request has been rejected by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            string body = $@"
<h3>Work From Home Request Rejected</h3>

<p>Dear Team,</p>

<p>The following Work From Home request has been rejected.</p>

<table border='1' cellpadding='8' cellspacing='0'
style='border-collapse:collapse;'>

<tr>
<td><b>Employee Name</b></td>
<td>{request.EmployeeName}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{request.EmployeeId}</td>
</tr>

<tr>
<td><b>WFH Type</b></td>
<td>{request.LeaveType}</td>
</tr>

<tr>
<td><b>From Date</b></td>
<td>{request.FromDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>To Date</b></td>
<td>{request.ToDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>Reason</b></td>
<td>{request.Reason}</td>
</tr>

<tr>
<td><b>Rejected By</b></td>
<td>{approverName}</td>
</tr>

<tr>
<td><b>Rejected On</b></td>
<td>{DateTime.Now:dd-MMM-yyyy hh:mm tt}</td>
</tr>

</table>

<br/>

<p>Regards,<br/>EMS Team</p>";

            var notification = GetNotificationSettings();

            if (notification.EnableEmailNotifications &&
                notification.EnableWFHEmails)
            {
                foreach (var mail in emailList)
                {
                    try
                    {
                        await _emailService.SendEmailAsync(
                            mail,
                            "Work From Home Rejected",
                            body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Email failed for {mail}: {ex.Message}");
                    }
                }
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult(
                $"Work From Home rejected by {approverName}");
        }
    }
    public async Task<IActionResult> CancelWFH(

    int id,

    ClaimsPrincipal user)

    {

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees

            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)

            return new BadRequestObjectResult("Employee not found");

        var request = await _context.WorkFromHomeRequests

            .FirstOrDefaultAsync(x =>

                x.Id == id &&

                x.EmployeeId == employee.Employee_Id);

        if (request == null)

            return new NotFoundObjectResult("WFH request not found");

        if (request.Status != "Pending")

            return new BadRequestObjectResult(

                "Only pending WFH can be cancelled");

        request.Status = "Cancelled";

        await _context.SaveChangesAsync();

        return new OkObjectResult("WFH cancelled successfully");

    }

    private async Task UpdateAttendanceForApprovedWFHRequest(
    WorkFromHomeRequest request)
    {
        for (var date = request.FromDate.Date;
             date <= request.ToDate.Date;
             date = date.AddDays(1))
        {
            // Skip Saturday and Sunday
            if (date.DayOfWeek == DayOfWeek.Saturday ||
                date.DayOfWeek == DayOfWeek.Sunday)
            {
                continue;
            }

            var attendance = await _context.Attendance
                .FirstOrDefaultAsync(a =>
                    a.Employee_Id == request.EmployeeId &&
                    a.Attendance_Date.Date == date);

            if (attendance == null)
            {
                attendance = new Attendance
                {
                    Employee_Id = request.EmployeeId,
                    Attendance_Date = date,
                    Status = "WFH",
                    WorkingMinutes = 0,
                    TotalBreakMinutes = 0
                };

                _context.Attendance.Add(attendance);
            }
            else
            {
                attendance.Status = "WFH";
            }
        }
    }

    public async Task<IActionResult> MailAction(
      int leaveId,
      string action,
      string token,
      string approverEmail)
    {
        var leave = await _context.EmployeeLeaves
            .FirstOrDefaultAsync(x => x.Id == leaveId);

        if (leave == null)
            return new NotFoundObjectResult("Leave not found");

        // ============================================================
        // TOKEN VALIDATION
        // ============================================================

        if (string.IsNullOrWhiteSpace(token) ||
            leave.ApprovalToken != token)
        {
            return new UnauthorizedObjectResult(
                "Invalid or expired approval token.");
        }

        // ============================================================
        // ALREADY PROCESSED
        // ============================================================

        if (!string.Equals(
            leave.Status,
            "Pending",
            StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult(
                "Leave already processed");
        }

        // ============================================================
        // VALIDATE ACTION
        // ============================================================

        if (!action.Equals(
                "ApproveAsLeave",
                StringComparison.OrdinalIgnoreCase)
            &&
            !action.Equals(
                "ApproveAsWFH",
                StringComparison.OrdinalIgnoreCase)
            &&
            !action.Equals(
                "Reject",
                StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult(
                "Invalid action. Use ApproveAsLeave, ApproveAsWFH or Reject.");
        }

        // ============================================================
        // APPROVE AS LEAVE
        // ============================================================

        if (action.Equals(
            "ApproveAsLeave",
            StringComparison.OrdinalIgnoreCase))
        {
            leave.Status = "Approved";

            // Keep this only if ApprovedType exists in your model
            leave.ApprovedType = "Leave";

            var result =
                await _leaveBalanceService
                    .ApproveLeaveAsync(leave);

            leave.PaidLeaveDays =
                result.PaidLeaves;

            leave.LOPDays =
                result.LopDays;
        }

        // ============================================================
        // APPROVE AS WFH
        // ============================================================

        else if (action.Equals(
            "ApproveAsWFH",
            StringComparison.OrdinalIgnoreCase))
        {
            leave.Status =
                $"Approved As WFH By {approverEmail}";

            // Keep this only if ApprovedType exists
            leave.ApprovedType = "WFH";
            leave.LeaveType = "WFH";

            await UpdateAttendanceForApprovedWFH(leave);
        }

        // ============================================================
        // REJECT
        // ============================================================

        else if (action.Equals(
            "Reject",
            StringComparison.OrdinalIgnoreCase))
        {
            leave.Status =
                $"Rejected By {approverEmail}";
        }

        // ============================================================
        // COMMON APPROVAL INFORMATION
        // ============================================================

        leave.ApprovedBy = approverEmail;
        leave.ApprovedOn = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // ============================================================
        // RESULT TEXT
        // ============================================================

        string resultText;

        if (action.Equals(
            "ApproveAsWFH",
            StringComparison.OrdinalIgnoreCase))
        {
            resultText = "Approved as Work From Home";
        }
        else if (action.Equals(
            "ApproveAsLeave",
            StringComparison.OrdinalIgnoreCase))
        {
            resultText = "Approved as Leave";
        }
        else
        {
            resultText = "Rejected";
        }

        // ============================================================
        // GET EMPLOYEE
        // ============================================================

        var employee = await _context.Employees
            .FirstOrDefaultAsync(x =>
                x.Employee_Id == leave.EmployeeId);

        // ============================================================
        // SEND RESULT EMAIL TO EMPLOYEE
        // ============================================================

        if (employee != null &&
            !string.IsNullOrWhiteSpace(employee.Email))
        {
            string employeeMailBody = $@"
<h3>Leave Request {resultText}</h3>

<p>Dear {employee.Name},</p>

<p>
Your leave request has been
<b>{resultText}</b>
by the approver.
</p>

<table border='1'
       cellpadding='8'
       cellspacing='0'
       style='border-collapse:collapse;'>

<tr>
<td><b>Employee Name</b></td>
<td>{leave.EmployeeName}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{leave.EmployeeId}</td>
</tr>

<tr>
<td><b>Leave Type</b></td>
<td>{leave.LeaveType}</td>
</tr>

<tr>
<td><b>From Date</b></td>
<td>{leave.FromDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>To Date</b></td>
<td>{leave.ToDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>Reason</b></td>
<td>{leave.Reason}</td>
</tr>

<tr>
<td><b>Decision</b></td>
<td>{resultText}</td>
</tr>

<tr>
<td><b>Approved By</b></td>
<td>{leave.ApprovedBy}</td>
</tr>

<tr>
<td><b>Approved On</b></td>
<td>{leave.ApprovedOn:dd-MMM-yyyy hh:mm tt}</td>
</tr>

</table>

<br/>

<p>Regards,<br/>EMS Team</p>
";

            await _emailService.SendEmailAsync(
                employee.Email,
                $"Leave Request {resultText} | #{leave.Id} | {DateTime.Now:yyyyMMddHHmmssfff}",
                employeeMailBody);
        }

        return new OkObjectResult(
            $"Leave request {resultText} successfully");
    }
    public async Task<IActionResult> WFHMailAction(
       int requestId,
       string action,
       string token,
       string approverEmail)
    {
        var request = await _context.WorkFromHomeRequests
            .FirstOrDefaultAsync(x => x.Id == requestId);

        if (request == null)
            return new NotFoundObjectResult(
                "WFH request not found");

        // ============================================================
        // TOKEN VALIDATION
        // ============================================================

        if (string.IsNullOrWhiteSpace(token) ||
            request.ApprovalToken != token)
        {
            return new UnauthorizedObjectResult(
                "Invalid or expired approval token.");
        }

        // ============================================================
        // ALREADY PROCESSED
        // ============================================================

        if (!string.Equals(
            request.Status,
            "Pending",
            StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult(
                "WFH request already processed");
        }

        // ============================================================
        // VALIDATE ACTION
        // ============================================================

        if (!action.Equals(
                "ApproveAsWFH",
                StringComparison.OrdinalIgnoreCase)
            &&
            !action.Equals(
                "ApproveAsLeave",
                StringComparison.OrdinalIgnoreCase)
            &&
            !action.Equals(
                "Reject",
                StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult(
                "Invalid action. Use ApproveAsWFH, ApproveAsLeave or Reject.");
        }

        // ============================================================
        // APPROVE AS WFH
        // ============================================================

        if (action.Equals(
            "ApproveAsWFH",
            StringComparison.OrdinalIgnoreCase))
        {
            request.Status =
                $"Approved As WFH By {approverEmail}";

            request.ApprovedType = "WFH";
            request.LeaveType = "WFH";

            request.ApprovedBy =
                approverEmail;

            request.ApprovedOn =
                DateTime.UtcNow;

            // Create/update attendance as WFH
            await UpdateAttendanceForApprovedWFHRequest(request);

            _context.UserNotifications.Add(
                new UserNotification
                {
                    Employee_Id = request.EmployeeId,

                    Title = "WFH Approved",

                    Message =
                        $"Your Work From Home request has been approved as WFH by {approverEmail}.",

                    IsRead = false,

                    CreatedAt = DateTime.UtcNow
                });
        }

        // ============================================================
        // APPROVE WFH AS LEAVE
        // ============================================================

        else if (action.Equals(
            "ApproveAsLeave",
            StringComparison.OrdinalIgnoreCase))
        {
            var leave = new EmployeeLeave
            {
                EmployeeId =
        request.EmployeeId,

                EmployeeName =
        request.EmployeeName,

                FromDate =
        request.FromDate,

                ToDate =
        request.ToDate,

                Reason =
        request.Reason,

                LeaveType =
        "Leave",

                ApprovedType =
        "Leave",

                Status =
        "Approved",

                ApprovedBy =
        approverEmail,

                ApprovedOn =
        DateTime.UtcNow,

                AppliedDate = request.AppliedOn.HasValue
        ? DateOnly.FromDateTime(request.AppliedOn.Value)
        : DateOnly.FromDateTime(DateTime.UtcNow),

                CreatedAt = request.AppliedOn ?? DateTime.UtcNow
            };// Calculate leave balance
            var result =
                await _leaveBalanceService
                    .ApproveLeaveAsync(leave);

            leave.PaidLeaveDays =
                result.PaidLeaves;

            leave.LOPDays =
                result.LopDays;

            _context.EmployeeLeaves.Add(leave);

            // Update original WFH request
            request.Status =
                $"Approved As Leave By {approverEmail}";
            request.LeaveType = "Leave";
            request.ApprovedType = "Leave";

            request.ApprovedBy =
                approverEmail;

            request.ApprovedOn =
                DateTime.UtcNow;

            _context.UserNotifications.Add(
                new UserNotification
                {
                    Employee_Id =
                        request.EmployeeId,

                    Title =
                        "WFH Request Approved as Leave",

                    Message =
                        $"Your Work From Home request has been approved as Leave by {approverEmail}.",

                    IsRead = false,

                    CreatedAt = DateTime.UtcNow
                });
        }

        // ============================================================
        // REJECT
        // ============================================================

        else if (action.Equals(
            "Reject",
            StringComparison.OrdinalIgnoreCase))
        {
            request.Status =
                $"Rejected By {approverEmail}";

            request.ApprovedBy =
                approverEmail;

            request.ApprovedOn =
                DateTime.UtcNow;

            _context.UserNotifications.Add(
                new UserNotification
                {
                    Employee_Id =
                        request.EmployeeId,

                    Title =
                        "WFH Rejected",

                    Message =
                        $"Your Work From Home request has been rejected by {approverEmail}.",

                    IsRead = false,

                    CreatedAt = DateTime.UtcNow
                });
        }

        await _context.SaveChangesAsync();

        // ============================================================
        // RESULT TEXT
        // ============================================================

        string resultText;

        if (action.Equals(
            "ApproveAsWFH",
            StringComparison.OrdinalIgnoreCase))
        {
            resultText =
                "Approved as Work From Home";
        }
        else if (action.Equals(
            "ApproveAsLeave",
            StringComparison.OrdinalIgnoreCase))
        {
            resultText =
                "Approved as Leave";
        }
        else
        {
            resultText =
                "Rejected";
        }

        // ============================================================
        // GET EMPLOYEE
        // ============================================================

        var employee = await _context.Employees
            .FirstOrDefaultAsync(x =>
                x.Employee_Id == request.EmployeeId);

        // ============================================================
        // SEND RESULT EMAIL TO EMPLOYEE
        // ============================================================

        if (employee != null &&
            !string.IsNullOrWhiteSpace(employee.Email))
        {
            string employeeMailBody = $@"
<h3>Work From Home Request {resultText}</h3>

<p>Dear {employee.Name},</p>

<p>
Your Work From Home request has been
<b>{resultText}</b>
by the approver.
</p>

<table border='1'
       cellpadding='8'
       cellspacing='0'
       style='border-collapse:collapse;'>

<tr>
<td><b>Employee Name</b></td>
<td>{request.EmployeeName}</td>
</tr>

<tr>
<td><b>Employee ID</b></td>
<td>{request.EmployeeId}</td>
</tr>

<tr>
<td><b>WFH Type</b></td>
<td>{request.LeaveType}</td>
</tr>

<tr>
<td><b>From Date</b></td>
<td>{request.FromDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>To Date</b></td>
<td>{request.ToDate:dd-MMM-yyyy}</td>
</tr>

<tr>
<td><b>Reason</b></td>
<td>{request.Reason}</td>
</tr>

<tr>
<td><b>Decision</b></td>
<td>{resultText}</td>
</tr>

<tr>
<td><b>Approved By</b></td>
<td>{request.ApprovedBy}</td>
</tr>

<tr>
<td><b>Approved On</b></td>
<td>{request.ApprovedOn:dd-MMM-yyyy hh:mm tt}</td>
</tr>

</table>

<br/>

<p>Regards,<br/>EMS Team</p>
";

            await _emailService.SendEmailAsync(
                employee.Email,
                $"WFH Request {resultText} | #{request.Id} | {DateTime.Now:yyyyMMddHHmmssfff}",
                employeeMailBody);
        }

        return new OkObjectResult(
            $"WFH request {resultText} successfully");
    }



}

