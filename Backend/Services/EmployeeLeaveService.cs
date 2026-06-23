using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenXmlPowerTools;
using System.Security.Claims;

public class EmployeeLeaveService : IEmployeeLeaveService

{

    private readonly AppDbContext _context;

    private readonly IAdminNotificationService _notificationService;
    private readonly IEmailService _emailService;
    public EmployeeLeaveService(

    AppDbContext context,

   
    IAdminNotificationService notificationService,
    IEmailService emailService)
    {
        _context = context;
        _notificationService = notificationService;
        _emailService = emailService;
    }    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto, ClaimsPrincipal user)
    {
        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)
            return new BadRequestObjectResult(new { message = "Employee not found" });

        var fromDate = dto.FromDate.Date;
        var toDate = dto.ToDate.Date;

        if (fromDate > toDate)
        {
            return new BadRequestObjectResult(new
            {
                message = "From date cannot be greater than To date"
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

        var leave = new EmployeeLeave
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


            CreatedAt = DateTime.UtcNow
        };

        await _context.EmployeeLeaves.AddAsync(leave);
        await _context.SaveChangesAsync();
        var approvers = await _context.Employees
        .Where(x =>
            x.RoleName != null &&
            (
                x.RoleName.ToLower() == "manager" ||
                x.RoleName.ToLower() == "hr" ||
                x.RoleName.ToLower() == "hradmin"
            ))
        .ToListAsync();

        foreach (var approver in approvers)
        {
            if (!string.IsNullOrWhiteSpace(approver.Email))
            {
                await _emailService.SendEmailAsync(

     approver.Email,

     $"Leave Approval Request - {employee.Name} ({employee.Employee_Id})",

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

Please log in to the EMS application using the link below:
</p>
 
<p>
<a href='http://16.112.124.216/login' target='_blank'>

EMS Login Portal
</a>
</p>
 
<p>

Or copy and paste the URL into your browser:
<br/>
<b>http://16.112.124.216/login</b>
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




    public async Task<IActionResult> UpdateStatus(
    int id,
    string status,
    ClaimsPrincipal user)
    {
        var leave = await _context.EmployeeLeaves.FindAsync(id);

        if (leave == null)
            return new NotFoundObjectResult("Leave not found");

        if (leave.Status != null &&
            leave.Status.StartsWith("Approved") &&
            status == "Approved")
        {
            return new BadRequestObjectResult("Already approved");
        }

        var balance = await _context.EmployeeLeaveBalances
            .FirstOrDefaultAsync(b => b.Employee_Id == leave.EmployeeId);

        if (balance == null)
        {
            balance = new EmployeeLeaveBalance
            {
                Employee_Id = leave.EmployeeId
            };

            _context.EmployeeLeaveBalances.Add(balance);
            await _context.SaveChangesAsync();
        }

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var loggedInUser = await _context.Employees
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

        if (loggedInUser == null)
            return new UnauthorizedObjectResult("User not found");
        var approver = await _context.Employees
            .FirstOrDefaultAsync(x => x.Employee_Id == loggedInUser.Employee_Id);

        string approverName = "";

        if (!string.IsNullOrWhiteSpace(approver?.Name))
        {
            approverName = approver.Name
                .Trim()
                .Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault() ?? "";
        }
        var role = loggedInUser.RoleName?.Trim();

        if (!string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(role, "HR", StringComparison.OrdinalIgnoreCase))
        {
            return new BadRequestObjectResult(
                "Only Manager or HR can approve leave");
        }
        Console.WriteLine($"Original Name = {approver.Name}");
        Console.WriteLine($"First Name = {approverName}");

        // Save approver details

        leave.ApprovedBy = approverName;
        leave.ApprovedOn = DateTime.UtcNow;
        if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase))
        {
            leave.ManagerStatus = status;
        }

        if (string.Equals(role, "HR", StringComparison.OrdinalIgnoreCase))
        {
            leave.HRStatus = status;
        }
        var employee = await _context.Employees
    .FirstOrDefaultAsync(x => x.Employee_Id == leave.EmployeeId);
        if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            leave.Status = $"Approved By {approverName}";

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = leave.EmployeeId,
                Title = "Leave Approved",
                Message = $"Your leave request has been approved by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            await _emailService.SendEmailAsync(
                employee.Email,
                "Leave Approved",
                $@"
        <h3>Leave Request Approved</h3>

        <p>Dear {leave.EmployeeName},</p>

        <p>Your leave request has been approved.</p>

        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
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

        <p>Regards,<br/>EMS Team</p>");

            await RecalculateLeaveBalance(leave.EmployeeId);

            return new OkObjectResult(
                $"Leave approved by {approverName}");
        }
        else
        {
            leave.Status = $"Rejected By {approverName}";

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = leave.EmployeeId,
                Title = "Leave Rejected",
                Message = $"Your leave request has been rejected by {approverName}.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            if (employee != null && !string.IsNullOrWhiteSpace(employee.Email))
            {
                await _emailService.SendEmailAsync(
                    employee.Email,
                    "Leave Rejected",
                    $@"
            <h3>Leave Request Rejected</h3>

            <p>Dear {leave.EmployeeName},</p>

            <p>Your leave request has been rejected.</p>

            <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse;'>
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

            <p>Regards,<br/>EMS Team</p>");
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult(
                $"Leave rejected by {approverName}");
        }
    }
    public async Task<IActionResult> GetAllLeaves()

    {

        var leaves = await _context.EmployeeLeaves.ToListAsync();

        return new OkObjectResult(leaves);

    }

    public async Task<IActionResult> GetMyLeaves(ClaimsPrincipal user)

    {

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        var employee = await _context.Employees

        .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        var leaves = await _context.EmployeeLeaves

            .Where(l => l.EmployeeId == employee.Employee_Id)

            .ToListAsync();

        return new OkObjectResult(leaves);

    }

    public async Task<IActionResult> GetBalance(ClaimsPrincipal user)

    {

        // STEP 1: GET EMAIL FROM TOKEN

        var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

        if (string.IsNullOrEmpty(email))

            return new UnauthorizedObjectResult("Invalid token");

        // STEP 2: GET EMPLOYEE

        var employee = await _context.Employees

        .FirstOrDefaultAsync(e => e.Email.ToLower() == email);

        if (employee == null)

            return new BadRequestObjectResult("Employee not found");

        // STEP 3: GET LEAVE BALANCE

        var balance = await _context.EmployeeLeaveBalances

            .FirstOrDefaultAsync(b => b.Employee_Id == employee.Employee_Id);

        if (balance == null)

        {

            balance = new EmployeeLeaveBalance

            {

                Employee_Id = employee.Employee_Id

                // totals will use DB default values

            };

            _context.EmployeeLeaveBalances.Add(balance);

            await _context.SaveChangesAsync();

        }

        // STEP 4: RETURN DATA

        return new OkObjectResult(new

        {

            Earned = new

            {

                Total = balance.Earned_Total,

                Used = balance.Earned_Used,

                Remaining = balance.Earned_Total - balance.Earned_Used

            },

            Casual = new

            {

                Total = balance.Casual_Total,

                Used = balance.Casual_Used,

                Remaining = balance.Casual_Total - balance.Casual_Used

            },

            Sick = new

            {

                Total = balance.Sick_Total,

                Used = balance.Sick_Used,

                Remaining = balance.Sick_Total - balance.Sick_Used

            }

        });

    }

    public async Task<IActionResult> GetEmployeeLeaveDetails(string employeeId)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (employee == null)
            return new NotFoundObjectResult("Employee not found");

        var balance = await _context.EmployeeLeaveBalances
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (balance == null)
        {
            balance = new EmployeeLeaveBalance
            {
                Employee_Id = employeeId
            };

            _context.EmployeeLeaveBalances.Add(balance);
            await _context.SaveChangesAsync();
        }

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

            LeaveBalance = new
            {
                Earned = new
                {
                    Total = balance.Earned_Total,
                    Used = balance.Earned_Used,
                    Remaining = balance.Earned_Total - balance.Earned_Used
                },

                Casual = new
                {
                    Total = balance.Casual_Total,
                    Used = balance.Casual_Used,
                    Remaining = balance.Casual_Total - balance.Casual_Used
                },

                Sick = new
                {
                    Total = balance.Sick_Total,
                    Used = balance.Sick_Used,
                    Remaining = balance.Sick_Total - balance.Sick_Used
                }
            },

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

            .FirstOrDefaultAsync(l => l.Id == id && l.EmployeeId == employee.Employee_Id);

        if (leave == null)

            return new NotFoundObjectResult("Leave not found");

        if (leave.Status == "Rejected")

            return new BadRequestObjectResult("Already rejected");

        // 👉 If already approved → revert balance
        leave.Status = "Cancelled";

        await _context.SaveChangesAsync();

        await RecalculateLeaveBalance(employee.Employee_Id);

        return new OkObjectResult("Leave cancelled successfully");
       

        

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
    private async Task RecalculateLeaveBalance(string employeeId)
    {
        var balance = await _context.EmployeeLeaveBalances
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (balance == null)
            return;

        balance.Casual_Used = 0;
        balance.Sick_Used = 0;
        balance.Earned_Used = 0;

        var approvedLeaves = await _context.EmployeeLeaves
            .Where(x =>
                x.EmployeeId == employeeId &&
                x.Status.StartsWith("Approved"))
            .ToListAsync();

        foreach (var leave in approvedLeaves)
        {
            int days = await CalculateSandwichLeaveDays(
                employeeId,
                leave.FromDate,
                leave.ToDate);

            switch (leave.LeaveType?.Trim().ToLower())
            {
                case "casual":
                    balance.Casual_Used += days;
                    break;

                case "sick":
                    balance.Sick_Used += days;
                    break;

                case "earned":
                case "earned leave":
                    balance.Earned_Used += days;
                    break;
            }
        }

        await _context.SaveChangesAsync();
    }

}

