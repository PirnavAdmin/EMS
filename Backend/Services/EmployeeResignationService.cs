using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class EmployeeResignationService : IEmployeeResignationService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public EmployeeResignationService(
            AppDbContext context,
            IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // ============================================================
        // APPLY RESIGNATION
        // ============================================================

        public async Task<bool> ApplyResignation(
     CreateResignationDto dto,
     string employeeId)
        {
            try
            {
                var employee = await _context.Employees
     .FirstOrDefaultAsync(x =>
         x.Employee_Id == employeeId);

                if (employee == null)
                    return false;

                // Inactive employee cannot submit resignation
                if (!string.Equals(
                        employee.Status,
                        "Active",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Check existing pending resignation
                var existing = await _context.EmployeeResignations
     .FirstOrDefaultAsync(x =>
         x.Employee_Id == employeeId &&
         x.OverallStatus == "Pending");

                if (existing != null)
                    return false;

                var resignation = new EmployeeResignation
                {
                    Employee_Id = employeeId,

                    ResignationDate =
                        dto.ResignationDate,

                    LastWorkingDate =
                        dto.LastWorkingDate,

                    Reason =
                        dto.Reason,

                    NoticePeriod =
                        CalculateNoticePeriod(
                            dto.ResignationDate,
                            dto.LastWorkingDate),

                    OverallStatus =
                        "Pending",

                    CreatedDate =
                        DateTime.Now
                };

                _context.EmployeeResignations.Add(
                    resignation);

                await _context.SaveChangesAsync();

                // ====================================================
                // SEND REQUEST NOTIFICATIONS
                // HR + ADMIN + MANAGER + EMPLOYEE
                // ====================================================

                try
                {
                    await SendExitRequestNotifications(
                        employee,
                        resignation);
                }
                catch (Exception emailEx)
                {
                    Console.WriteLine(
                        $"Exit request email failed: {emailEx.Message}");
                }

                // ====================================================
                // ACTIVITY LOG
                // ====================================================

                _context.ActivityLogs.Add(
                    new ActivityLog
                    {
                        Activity =
                            $"Employee {employee.Employee_Id} " +
                            $"submitted resignation request.",

                        CreatedAt =
                            DateTime.UtcNow
                    });

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Apply resignation failed: {ex}");

                return false;
            }
        }

        // ============================================================
        // UPDATE RESIGNATION
        // ============================================================

        public async Task<bool> UpdateResignation(
            UpdateResignationDto dto)
        {
            try
            {
                var resignation =
                    await _context.EmployeeResignations
                        .FirstOrDefaultAsync(x =>
                            x.ResignationId ==
                            dto.ResignationId);

                if (resignation == null)
                    return false;

                // Only Pending requests can be edited
                if (!string.Equals(
                        resignation.OverallStatus,
                        "Pending",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                resignation.ResignationDate =
                    dto.ResignationDate;

                resignation.LastWorkingDate =
                    dto.LastWorkingDate;

                resignation.Reason =
                    dto.Reason;

                resignation.NoticePeriod =
                    CalculateNoticePeriod(
                        dto.ResignationDate,
                        dto.LastWorkingDate);

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Update resignation failed: {ex}");

                return false;
            }
        }

        // ============================================================
        // DELETE / CANCEL RESIGNATION
        // ============================================================

        public async Task<bool> DeleteResignation(
            int resignationId)
        {
            try
            {
                var resignation =
                    await _context.EmployeeResignations
                        .FirstOrDefaultAsync(x =>
                            x.ResignationId ==
                            resignationId);

                if (resignation == null)
                    return false;

                // Do not modify processed resignation
                if (!string.Equals(
                        resignation.OverallStatus,
                        "Pending",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }

                // Keep historical record.
                // Do not hard delete.
                resignation.OverallStatus =
                    "Cancelled";

                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Cancel resignation failed: {ex}");

                return false;
            }
        }

        // ============================================================
        // GET ALL
        // ============================================================

        public async Task<List<ResignationResponseDto>> GetAll()
        {
            return await _context.EmployeeResignations
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedDate)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId =
                        x.ResignationId,

                    Employee_Id =
                        x.Employee_Id,

                    ResignationDate =
                        x.ResignationDate,

                    LastWorkingDate =
                        x.LastWorkingDate,

                    NoticePeriod =
                        x.NoticePeriod,

                    Reason =
                        x.Reason,

                    OverallStatus =
                        x.OverallStatus,

                    ApprovedByRole =
                        x.ApprovedByRole,

                    ApprovedBy =
                        x.ApprovedBy,

                    ApprovedDate =
                        x.ApprovedDate,

                    ApprovalRemarks =
                        x.ApprovalRemarks,

                    RejectedByRole =
                        x.RejectedByRole,

                    RejectedBy =
                        x.RejectedBy,

                    RejectedDate =
                        x.RejectedDate,

                    RejectionRemarks =
                        x.RejectionRemarks,

                    CreatedDate =
                        x.CreatedDate
                })
                .ToListAsync();
        }

        // ============================================================
        // GET BY ID
        // ============================================================

        public async Task<ResignationResponseDto?> GetById(
            int resignationId)
        {
            return await _context.EmployeeResignations
                .AsNoTracking()
                .Where(x =>
                    x.ResignationId ==
                    resignationId)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId =
                        x.ResignationId,

                    Employee_Id =
                        x.Employee_Id,

                    ResignationDate =
                        x.ResignationDate,

                    LastWorkingDate =
                        x.LastWorkingDate,

                    NoticePeriod =
                        x.NoticePeriod,

                    Reason =
                        x.Reason,

                    OverallStatus =
                        x.OverallStatus,

                    ApprovedByRole =
                        x.ApprovedByRole,

                    ApprovedBy =
                        x.ApprovedBy,

                    ApprovedDate =
                        x.ApprovedDate,

                    ApprovalRemarks =
                        x.ApprovalRemarks,

                    RejectedByRole =
                        x.RejectedByRole,

                    RejectedBy =
                        x.RejectedBy,

                    RejectedDate =
                        x.RejectedDate,

                    RejectionRemarks =
                        x.RejectionRemarks,

                    CreatedDate =
                        x.CreatedDate
                })
                .FirstOrDefaultAsync();
        }

        // ============================================================
        // GET BY EMPLOYEE
        // ============================================================

        public async Task<List<ResignationResponseDto>>
            GetByEmployee(string employeeId)
        {
            return await _context.EmployeeResignations
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id ==
                    employeeId)
                .OrderByDescending(x =>
                    x.CreatedDate)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId =
                        x.ResignationId,

                    Employee_Id =
                        x.Employee_Id,

                    ResignationDate =
                        x.ResignationDate,

                    LastWorkingDate =
                        x.LastWorkingDate,

                    NoticePeriod =
                        x.NoticePeriod,

                    Reason =
                        x.Reason,

                    OverallStatus =
                        x.OverallStatus,

                    ApprovedByRole =
                        x.ApprovedByRole,

                    ApprovedBy =
                        x.ApprovedBy,

                    ApprovedDate =
                        x.ApprovedDate,

                    ApprovalRemarks =
                        x.ApprovalRemarks,

                    RejectedByRole =
                        x.RejectedByRole,

                    RejectedBy =
                        x.RejectedBy,

                    RejectedDate =
                        x.RejectedDate,

                    RejectionRemarks =
                        x.RejectionRemarks,

                    CreatedDate =
                        x.CreatedDate
                })
                .ToListAsync();
        }

        // ============================================================
        // GET PENDING APPROVALS
        // ============================================================

        public async Task<List<ResignationResponseDto>>
            GetPendingApprovals()
        {
            return await _context.EmployeeResignations
                .AsNoTracking()
                .Where(x =>
                    x.OverallStatus == "Pending")
                .OrderByDescending(x =>
                    x.CreatedDate)
                .Select(x => new ResignationResponseDto
                {
                    ResignationId =
                        x.ResignationId,

                    Employee_Id =
                        x.Employee_Id,

                    ResignationDate =
                        x.ResignationDate,

                    LastWorkingDate =
                        x.LastWorkingDate,

                    NoticePeriod =
                        x.NoticePeriod,

                    Reason =
                        x.Reason,

                    OverallStatus =
                        x.OverallStatus,

                    ApprovedByRole =
                        x.ApprovedByRole,

                    ApprovedBy =
                        x.ApprovedBy,

                    ApprovedDate =
                        x.ApprovedDate,

                    ApprovalRemarks =
                        x.ApprovalRemarks,

                    RejectedByRole =
                        x.RejectedByRole,

                    RejectedBy =
                        x.RejectedBy,

                    RejectedDate =
                        x.RejectedDate,

                    RejectionRemarks =
                        x.RejectionRemarks,

                    CreatedDate =
                        x.CreatedDate
                })
                .ToListAsync();
        }

        // ============================================================
        // EXIT APPROVAL
        //
        // Authorized:
        //     Admin
        //     HR
        //     Manager
        //
        // FIRST ACTION WINS
        //
        // Approved:
        //     Employee remains ACTIVE
        //     Clearance -> Automatically Created
        //
        // After LastWorkingDate:
        //     Employee -> INACTIVE
        //
        // Rejected:
        //     Employee -> remains ACTIVE
        // ============================================================

        public async Task<bool> ExitApproval(
            ExitApprovalDto dto,
            ClaimsPrincipal user)
        {
            bool processedSuccessfully = false;

            Employee? notificationEmployee = null;
            EmployeeResignation? notificationResignation = null;

            string notificationRole = string.Empty;
            string notificationApprover = string.Empty;

            try
            {
                // ====================================================
                // MySQL retrying execution strategy
                // ====================================================

                var strategy =
                    _context.Database.CreateExecutionStrategy();

                await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction =
                        await _context.Database
                            .BeginTransactionAsync();

                    try
                    {
                        // =================================================
                        // 1. GET RESIGNATION WITH ROW LOCK
                        // =================================================

                        var resignation =
                            await _context.EmployeeResignations
                                .FromSqlInterpolated($"""
                                    SELECT *
                                    FROM EmployeeResignation
                                    WHERE ResignationId = {dto.ResignationId}
                                    FOR UPDATE
                                    """)
                                .FirstOrDefaultAsync();

                        if (resignation == null)
                        {
                            await transaction.RollbackAsync();
                            return;
                        }

                        // =================================================
                        // 2. FIRST ACTION WINS
                        // =================================================

                        if (!string.Equals(
                                resignation.OverallStatus,
                                "Pending",
                                StringComparison.OrdinalIgnoreCase))
                        {
                            await transaction.RollbackAsync();
                            return;
                        }

                        // =================================================
                        // 3. IDENTIFY LOGGED-IN USER
                        // =================================================

                        var adminIdClaim =
                            user.FindFirst("AdminId")?.Value;

                        string role = string.Empty;
                        string approverName = string.Empty;

                        // =================================================
                        // 4. ADMIN
                        // =================================================

                        if (!string.IsNullOrWhiteSpace(
                                adminIdClaim) &&
                            int.TryParse(
                                adminIdClaim,
                                out int adminId))
                        {
                            var admin =
                                await _context.Admins
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(x =>
                                        x.Id == adminId);

                            if (admin == null)
                            {
                                await transaction.RollbackAsync();
                                return;
                            }

                            role = "Admin";

                            approverName =
                                !string.IsNullOrWhiteSpace(
                                    admin.Email)
                                    ? admin.Email
                                    : $"Admin {admin.Id}";
                        }
                        else
                        {
                            // =============================================
                            // 5. HR / MANAGER
                            // =============================================

                            var employeeId =
                                user.FindFirst("EmployeeId")?.Value;

                            if (string.IsNullOrWhiteSpace(
                                    employeeId))
                            {
                                await transaction.RollbackAsync();
                                return;
                            }

                            var loggedInEmployee =
                                await _context.Employees
                                    .FirstOrDefaultAsync(x =>
                                        x.Employee_Id ==
                                        employeeId);

                            if (loggedInEmployee == null)
                            {
                                await transaction.RollbackAsync();
                                return;
                            }

                            role =
                                loggedInEmployee.RoleName
                                ?? string.Empty;

                            // If RoleName is empty,
                            // get role from Role table.
                            if (string.IsNullOrWhiteSpace(role) &&
                                loggedInEmployee.RoleId != null)
                            {
                                var dbRole =
                                    await _context.Roles
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(x =>
                                            x.RoleId ==
                                            loggedInEmployee.RoleId);

                                role =
                                    dbRole?.Name ??
                                    string.Empty;
                            }

                            if (string.IsNullOrWhiteSpace(
                                    role))
                            {
                                await transaction.RollbackAsync();
                                return;
                            }

                            approverName =
                                !string.IsNullOrWhiteSpace(
                                    loggedInEmployee.Name)
                                    ? loggedInEmployee.Name
                                    : employeeId;
                        }

                        // =================================================
                        // 6. CHECK AUTHORIZED ROLE
                        // =================================================

                        if (!IsAuthorizedExitRole(role))
                        {
                            await transaction.RollbackAsync();
                            return;
                        }

                        // =================================================
                        // 7. GET EMPLOYEE
                        // =================================================

                        var employee =
                            await _context.Employees
                                .FirstOrDefaultAsync(x =>
                                    x.Employee_Id ==
                                    resignation.Employee_Id);

                        if (employee == null)
                        {
                            await transaction.RollbackAsync();
                            return;
                        }

                        // =================================================
                        // 8. APPROVED
                        // =================================================

                        if (dto.IsApproved)
                        {
                            resignation.OverallStatus =
                                "Approved";

                            resignation.ApprovedByRole =
                                role;

                            resignation.ApprovedBy =
                                approverName;

                            resignation.ApprovedDate =
                                DateTime.Now;

                            resignation.ApprovalRemarks =
                                dto.Remarks;

                            // IMPORTANT:
                            // Employee remains ACTIVE after approval.
                            //
                            // Employee will become INACTIVE only
                            // after the LastWorkingDate has passed.
                            //
                            // DO NOT DO:
                            //
                            // employee.Status = "Inactive";

                            // ---------------------------------------------
                            // AUTOMATIC CLEARANCE CREATION
                            // ---------------------------------------------

                            var existingClearance =
                                await _context.EmployeeClearances
                                    .FirstOrDefaultAsync(x =>
                                        x.ResignationId ==
                                        resignation.ResignationId);

                            if (existingClearance == null)
                            {
                                var clearance =
                                    new EmployeeClearance
                                    {
                                        ResignationId =
                                            resignation.ResignationId,

                                        ITStatus =
                                            "Pending",

                                        AdminStatus =
                                            "Pending",

                                        FinanceStatus =
                                            "Pending",

                                        HRStatus =
                                            "Pending",

                                        ITRemarks =
                                            null,

                                        AdminRemarks =
                                            null,

                                        FinanceRemarks =
                                            null,

                                        HRRemarks =
                                            null,

                                        CompletedDate =
                                            null
                                    };

                                _context.EmployeeClearances.Add(
                                    clearance);
                            }

                            // ---------------------------------------------
                            // ACTIVITY LOG
                            // ---------------------------------------------

                            _context.ActivityLogs.Add(
                                new ActivityLog
                                {
                                    Activity =
                                        $"Exit request " +
                                        $"#{resignation.ResignationId} " +
                                        $"approved by {role} " +
                                        $"({approverName}). " +
                                        $"Employee " +
                                        $"{employee.Employee_Id} " +
                                        $"will remain Active until " +
                                        $"Last Working Date " +
                                        $"{resignation.LastWorkingDate:dd-MM-yyyy}. " +
                                        $"Employee clearance created.",

                                    CreatedAt =
                                        DateTime.UtcNow
                                });

                            // ---------------------------------------------
                            // SAVE ALL CHANGES
                            // ---------------------------------------------

                            await _context.SaveChangesAsync();

                            // ---------------------------------------------
                            // COMMIT
                            // ---------------------------------------------

                            await transaction.CommitAsync();

                            // ---------------------------------------------
                            // EMAIL DATA
                            // ---------------------------------------------

                            notificationEmployee =
                                employee;

                            notificationResignation =
                                resignation;

                            notificationRole =
                                role;

                            notificationApprover =
                                approverName;

                            processedSuccessfully =
                                true;

                            return;
                        }

                        // =================================================
                        // 9. REJECTED
                        // =================================================

                        resignation.OverallStatus =
                            "Rejected";

                        resignation.RejectedByRole =
                            role;

                        resignation.RejectedBy =
                            approverName;

                        resignation.RejectedDate =
                            DateTime.Now;

                        resignation.RejectionRemarks =
                            dto.Remarks;

                        // Employee remains Active
                        employee.Status =
                            "Active";

                        // ---------------------------------------------
                        // ACTIVITY LOG
                        // ---------------------------------------------

                        _context.ActivityLogs.Add(
                            new ActivityLog
                            {
                                Activity =
                                    $"Exit request " +
                                    $"#{resignation.ResignationId} " +
                                    $"rejected by {role} " +
                                    $"({approverName}) " +
                                    $"for employee " +
                                    $"{employee.Employee_Id}.",

                                CreatedAt =
                                    DateTime.UtcNow
                            });

                        // ---------------------------------------------
                        // SAVE
                        // ---------------------------------------------

                        await _context.SaveChangesAsync();

                        // ---------------------------------------------
                        // COMMIT
                        // ---------------------------------------------

                        await transaction.CommitAsync();

                        // ---------------------------------------------
                        // EMAIL DATA
                        // ---------------------------------------------

                        notificationEmployee =
                            employee;

                        notificationResignation =
                            resignation;

                        notificationRole =
                            role;

                        notificationApprover =
                            approverName;

                        processedSuccessfully =
                            true;
                    }
                    catch
                    {
                        try
                        {
                            await transaction.RollbackAsync();
                        }
                        catch
                        {
                            // Ignore rollback failure
                        }

                        throw;
                    }
                });

                // ========================================================
                // 10. SEND EMAIL AFTER DATABASE COMMIT
                // ========================================================

                if (processedSuccessfully &&
                    notificationEmployee != null &&
                    notificationResignation != null)
                {
                    try
                    {
                        if (dto.IsApproved)
                        {
                            await SendApprovalNotification(
                                notificationEmployee,
                                notificationResignation,
                                notificationRole,
                                notificationApprover);
                        }
                        else
                        {
                            await SendRejectionNotification(
                                notificationEmployee,
                                notificationResignation,
                                notificationRole,
                                notificationApprover);
                        }
                    }
                    catch (Exception emailEx)
                    {
                        Console.WriteLine(
                            $"Exit notification email failed: " +
                            $"{emailEx.Message}");
                    }
                }

                return processedSuccessfully;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Exit approval processing failed: {ex}");

                return false;
            }
        }

        // ============================================================
        // GET USER ROLE
        // ============================================================

        private static string? GetUserRole(
            ClaimsPrincipal user)
        {
            return user.FindFirst(
                       ClaimTypes.Role)?.Value
                   ?? user.FindFirst(
                       "role")?.Value
                   ?? user.FindFirst(
                       "Role")?.Value;
        }

        // ============================================================
        // AUTHORIZED ROLES
        // ============================================================

        private static bool IsAuthorizedExitRole(
            string role)
        {
            return role.Equals(
                       "Admin",
                       StringComparison.OrdinalIgnoreCase)
                || role.Equals(
                       "HR",
                       StringComparison.OrdinalIgnoreCase)
                || role.Equals(
                       "Manager",
                       StringComparison.OrdinalIgnoreCase);
        }

        // ============================================================
        // NOTICE PERIOD
        // ============================================================

        private static int CalculateNoticePeriod(
            DateTime resignationDate,
            DateTime lastWorkingDate)
        {
            var days =
                (lastWorkingDate.Date -
                 resignationDate.Date).Days;

            return days < 0
                ? 0
                : days;
        }

        // ============================================================
        // SEND EXIT REQUEST NOTIFICATIONS
        // ============================================================

        private async Task SendExitRequestNotifications(
            Employee employee,
            EmployeeResignation resignation)
        {
            var recipients =
                new List<string>();

            // Employee
            if (!string.IsNullOrWhiteSpace(
                    employee.Email))
            {
                recipients.Add(
                    employee.Email);
            }

            // Admin
            if (employee.AdminId.HasValue)
            {
                var admin =
                    await _context.Admins
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.Id ==
                            employee.AdminId.Value);

                if (admin != null &&
                    !string.IsNullOrWhiteSpace(
                        admin.Email))
                {
                    recipients.Add(
                        admin.Email);
                }
            }

            // Manager
            var managerEmail =
                await GetManagerEmail(
                    employee.Employee_Id);

            if (!string.IsNullOrWhiteSpace(
                    managerEmail))
            {
                recipients.Add(
                    managerEmail);
            }

            // HR
            var hrEmails =
                await _context.Employees
                    .AsNoTracking()
                    .Where(x =>
                        x.Status == "Active" &&
                        x.RoleName != null &&
                        x.Email != null &&
                        x.RoleName.ToLower() == "hr")
                    .Select(x => x.Email)
                    .ToListAsync();

            recipients.AddRange(
                hrEmails.Where(x =>
                    !string.IsNullOrWhiteSpace(x)));

            recipients =
                recipients
                    .Where(x =>
                        !string.IsNullOrWhiteSpace(x))
                    .Distinct(
                        StringComparer.OrdinalIgnoreCase)
                    .ToList();

            foreach (var email in recipients)
            {
                await _emailService.SendEmailAsync(
                    email,
                    "Employee Exit Request - Approval Required",
                    BuildExitRequestEmail(
                        employee,
                        resignation));
            }
        }

        // ============================================================
        // APPROVAL EMAIL
        // ============================================================

        private async Task SendApprovalNotification(
            Employee employee,
            EmployeeResignation resignation,
            string approvedByRole,
            string approvedBy)
        {
            var recipients =
                await GetNotificationRecipients(
                    employee);

            foreach (var email in recipients)
            {
                await _emailService.SendEmailAsync(
                    email,
                    "Employee Exit Request Approved",
                    BuildApprovalEmail(
                        employee,
                        resignation,
                        approvedByRole,
                        approvedBy));
            }
        }

        // ============================================================
        // REJECTION EMAIL
        // ============================================================

        private async Task SendRejectionNotification(
            Employee employee,
            EmployeeResignation resignation,
            string rejectedByRole,
            string rejectedBy)
        {
            var recipients =
                await GetNotificationRecipients(
                    employee);

            foreach (var email in recipients)
            {
                await _emailService.SendEmailAsync(
                    email,
                    "Employee Exit Request Rejected",
                    BuildRejectionEmail(
                        employee,
                        resignation,
                        rejectedByRole,
                        rejectedBy));
            }
        }

        // ============================================================
        // GET NOTIFICATION RECIPIENTS
        // ============================================================

        private async Task<List<string>>
            GetNotificationRecipients(
                Employee employee)
        {
            var recipients =
                new List<string>();

            // Employee
            if (!string.IsNullOrWhiteSpace(
                    employee.Email))
            {
                recipients.Add(
                    employee.Email);
            }

            // Admin
            if (employee.AdminId.HasValue)
            {
                var admin =
                    await _context.Admins
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.Id ==
                            employee.AdminId.Value);

                if (admin != null &&
                    !string.IsNullOrWhiteSpace(
                        admin.Email))
                {
                    recipients.Add(
                        admin.Email);
                }
            }

            // Manager
            var managerEmail =
                await GetManagerEmail(
                    employee.Employee_Id);

            if (!string.IsNullOrWhiteSpace(
                    managerEmail))
            {
                recipients.Add(
                    managerEmail);
            }

            // HR
            var hrEmails =
                await _context.Employees
                    .AsNoTracking()
                    .Where(x =>
                        x.Status == "Active" &&
                        x.RoleName != null &&
                        x.Email != null &&
                        x.RoleName.ToLower() == "hr")
                    .Select(x => x.Email)
                    .ToListAsync();

            recipients.AddRange(
                hrEmails.Where(x =>
                    !string.IsNullOrWhiteSpace(x)));

            return recipients
                .Where(x =>
                    !string.IsNullOrWhiteSpace(x))
                .Distinct(
                    StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        // ============================================================
        // GET MANAGER EMAIL
        // ============================================================

        private async Task<string?> GetManagerEmail(
            string employeeId)
        {
            var teamMember =
                await _context.TeamMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.EmployeeId ==
                        employeeId);

            if (teamMember == null)
                return null;

            var team =
                await _context.Teams
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Id ==
                        teamMember.TeamId);

            if (team == null)
                return null;

            var manager =
                await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id ==
                            team.ReportingManagerId &&
                        x.Status == "Active");

            return manager?.Email;
        }

        // ============================================================
        // REQUEST EMAIL BODY
        // ============================================================

        private static string BuildExitRequestEmail(
            Employee employee,
            EmployeeResignation resignation)
        {
            return $"""
                <html>
                <body>

                    <h2>Employee Exit Request</h2>

                    <p>
                        A new employee exit/resignation request
                        requires approval.
                    </p>

                    <p>
                        <b>Employee ID:</b>
                        {employee.Employee_Id}
                    </p>

                    <p>
                        <b>Employee Name:</b>
                        {employee.Name}
                    </p>

                    <p>
                        <b>Department:</b>
                        {employee.Department}
                    </p>

                    <p>
                        <b>Resignation Date:</b>
                        {resignation.ResignationDate:dd-MM-yyyy}
                    </p>

                    <p>
                        <b>Last Working Date:</b>
                        {resignation.LastWorkingDate:dd-MM-yyyy}
                    </p>

                    <p>
                        <b>Notice Period:</b>
                        {resignation.NoticePeriod} days
                    </p>

                    <p>
                        <b>Reason:</b>
                        {resignation.Reason}
                    </p>

                    <p>
                        Please open the EMS system and
                        approve or reject this request.
                    </p>

                </body>
                </html>
                """;
        }

        // ============================================================
        // APPROVAL EMAIL BODY
        // ============================================================

        private static string BuildApprovalEmail(
            Employee employee,
            EmployeeResignation resignation,
            string approvedByRole,
            string approvedBy)
        {
            return $"""
                <html>
                <body>

                    <h2>Employee Exit Request Approved</h2>

                    <p>
                        The employee exit request has been approved.
                    </p>

                    <p>
                        <b>Employee ID:</b>
                        {employee.Employee_Id}
                    </p>

                    <p>
                        <b>Employee Name:</b>
                        {employee.Name}
                    </p>

                    <p>
                        <b>Last Working Date:</b>
                        {resignation.LastWorkingDate:dd-MM-yyyy}
                    </p>

                    <p>
                        <b>Approved By:</b>
                        {approvedBy}
                    </p>

                    <p>
                        <b>Approved By Role:</b>
                        {approvedByRole}
                    </p>

                    <p>
                        <b>Remarks:</b>
                        {resignation.ApprovalRemarks}
                    </p>

                    <p>
                        The employee will remain
                        <b>Active</b> until the Last Working Date.
                    </p>

                    <p>
                        The employee will be automatically marked
                        <b>Inactive</b> after the Last Working Date.
                    </p>

                    <p>
                        Employee clearance has been created
                        and is now pending with IT, Admin,
                        Finance and HR.
                    </p>

                </body>
                </html>
                """;
        }

        // ============================================================
        // REJECTION EMAIL BODY
        // ============================================================

        private static string BuildRejectionEmail(
            Employee employee,
            EmployeeResignation resignation,
            string rejectedByRole,
            string rejectedBy)
        {
            return $"""
                <html>
                <body>

                    <h2>Employee Exit Request Rejected</h2>

                    <p>
                        The employee exit request has been rejected.
                    </p>

                    <p>
                        <b>Employee ID:</b>
                        {employee.Employee_Id}
                    </p>

                    <p>
                        <b>Employee Name:</b>
                        {employee.Name}
                    </p>

                    <p>
                        <b>Rejected By:</b>
                        {rejectedBy}
                    </p>

                    <p>
                        <b>Rejected By Role:</b>
                        {rejectedByRole}
                    </p>

                    <p>
                        <b>Remarks:</b>
                        {resignation.RejectionRemarks}
                    </p>

                    <p>
                        The employee remains
                        <b>Active</b>.
                    </p>

                </body>
                </html>
                """;
        }
    }
}