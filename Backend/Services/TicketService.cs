using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class TicketService : ITicketService
    {
        private readonly AppDbContext _context;
        private readonly IUserNotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly ITicketAssignmentEngine _assignmentEngine;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TicketService(
            AppDbContext context,
            IUserNotificationService notificationService,
            IEmailService emailService,
            ITicketAssignmentEngine assignmentEngine,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
            _assignmentEngine = assignmentEngine;
            _httpContextAccessor = httpContextAccessor;
        }

        // =========================================================
        // 🔥 Helper: Extract OrganizationId from JWT Context
        // =========================================================
        private int GetCurrentOrgId()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return 1;

            var orgId = CurrentUserHelper.GetOrganizationId(user);
            if (orgId.HasValue && orgId.Value > 0) return orgId.Value;

            // Fallback 1: via AdminId claim
            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int aid) && aid > 0)
            {
                var admin = _context.Admins.AsNoTracking().FirstOrDefault(a => a.Id == aid);
                if (admin?.OrganizationId != null && admin.OrganizationId > 0)
                    return admin.OrganizationId.Value;
            }

            // Fallback 2: via EmployeeId claim
            var empId = CurrentUserHelper.GetEmployeeId(user);
            if (!string.IsNullOrWhiteSpace(empId))
            {
                var emp = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Employee_Id == empId);
                if (emp?.OrganizationId != null && emp.OrganizationId > 0)
                    return emp.OrganizationId.Value;
            }

            // Fallback 3: via Email claim
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower()
                     ?? user.FindFirst("email")?.Value?.Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(email))
            {
                var admin = _context.Admins.AsNoTracking().FirstOrDefault(a => a.Email.ToLower() == email);
                if (admin?.OrganizationId != null && admin.OrganizationId > 0)
                    return admin.OrganizationId.Value;

                var emp = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Email.ToLower() == email);
                if (emp?.OrganizationId != null && emp.OrganizationId > 0)
                    return emp.OrganizationId.Value;
            }

            return 1;
        }

        private async Task<(string Id, string Name, bool IsAdmin)> ResolveUserIdentityAsync(ClaimsPrincipal user, int orgId)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower()
                     ?? user.FindFirst("email")?.Value?.Trim().ToLower()
                     ?? user.FindFirst(ClaimTypes.Name)?.Value?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Invalid user.");

            // 1. Try matching active employee in current organization (or legacy admin-linked)
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e =>
                    e.Email != null &&
                    e.Email.ToLower() == email &&
                    (e.OrganizationId == orgId || (e.AdminId.HasValue && e.AdminId.Value > 0)) &&
                    e.Status == "Active");

            if (employee != null)
            {
                return (employee.Employee_Id, string.IsNullOrWhiteSpace(employee.Name) ? employee.Employee_Id : employee.Name, false);
            }

            // 2. Check if caller is Admin in this organization
            var admin = await _context.Admins
                .AsNoTracking()
                .FirstOrDefaultAsync(a =>
                    a.Email.ToLower() == email &&
                    (a.OrganizationId == orgId || a.OrganizationId == null || a.OrganizationId == 0) &&
                    a.IsActive);

            if (admin != null)
            {
                string adminIdentifier = !string.IsNullOrWhiteSpace(admin.FullName) ? admin.FullName : admin.Email;
                return (admin.Email, adminIdentifier, true);
            }

            // 3. Fallback check for Admin/SuperAdmin role claim
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;
            if (string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(roleClaim, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return (email, "Admin", true);
            }

            throw new Exception("User not found in the current organization.");
        }

        public async Task<CreateTicketResponseDto> CreateTicket(CreateTicketDto dto, ClaimsPrincipal user)
        {
            int orgId = dto.OrganizationId.HasValue && dto.OrganizationId.Value > 0
                ? dto.OrganizationId.Value
                : GetCurrentOrgId();

            // Resolve caller identity (Supports both Admin and Employee)
            var (creatorId, creatorName, isAdmin) = await ResolveUserIdentityAsync(user, orgId);

            // Validate or Resolve Project - Scoped to Organization
            Project? project = null;

            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.Id == dto.ProjectId.Value && p.OrganizationId == orgId);
            }

            // Fallback: If UI did not provide ProjectId or project not found, use first project of this organization
            if (project == null)
            {
                project = await _context.Projects
                    .FirstOrDefaultAsync(p => p.OrganizationId == orgId);
            }

            // If still no project exists in this organization, auto-create a default General project
            if (project == null)
            {
                project = new Project
                {
                    OrganizationId = orgId,
                    Project_Name = "General",
                    Project_Id = $"PRJ-{orgId}-GEN",
                    ProjectCode = "GEN",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Projects.Add(project);
                await _context.SaveChangesAsync();
            }

            int resolvedProjectId = project.Id;

            // Validate Assigned Employee only when manually assigned - Scoped to Organization
            Employee? assignedEmployee = null;

            if (!string.IsNullOrWhiteSpace(dto.AssignedTo) &&
                !dto.AssignedTo.Equals("null", StringComparison.OrdinalIgnoreCase) &&
                !dto.AssignedTo.Equals("undefined", StringComparison.OrdinalIgnoreCase) &&
                !dto.AssignedTo.Equals("unassigned", StringComparison.OrdinalIgnoreCase))
            {
                var assignedInput = dto.AssignedTo.Trim();
                var assignedInputLower = assignedInput.ToLower();

                // Clean composite labels like "P434 - Akhil Reddy" or "Akhil Reddy (P434)"
                var cleanInput = assignedInput;
                if (cleanInput.Contains(" - "))
                {
                    cleanInput = cleanInput.Split(" - ")[0].Trim();
                }
                else if (cleanInput.Contains("(") && cleanInput.Contains(")"))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(cleanInput, @"\(([^)]+)\)");
                    if (match.Success)
                    {
                        cleanInput = match.Groups[1].Value.Trim();
                    }
                }

                var orgAdminIds = await _context.Admins
                    .AsNoTracking()
                    .Where(a => a.OrganizationId == orgId)
                    .Select(a => a.Id)
                    .ToListAsync();

                assignedEmployee = await _context.Employees
                    .FirstOrDefaultAsync(e =>
                        (e.Employee_Id == cleanInput ||
                         e.Employee_Id.ToLower() == cleanInput.ToLower() ||
                         e.Employee_Id == assignedInput ||
                         e.Employee_Id.ToLower() == assignedInputLower ||
                         (e.Name != null && (e.Name == assignedInput || e.Name.ToLower() == assignedInputLower)) ||
                         (e.Email != null && (e.Email == assignedInput || e.Email.ToLower() == assignedInputLower))) &&
                        (e.OrganizationId == orgId || (e.AdminId.HasValue && orgAdminIds.Contains(e.AdminId.Value))));

                if (assignedEmployee != null)
                {
                    dto.AssignedTo = assignedEmployee.Employee_Id;
                }
                else
                {
                    // Check if assigned to an Admin in this organization
                    var matchedAdmin = await _context.Admins
                        .FirstOrDefaultAsync(a =>
                            (a.Email.ToLower() == assignedInputLower ||
                             (a.FullName != null && a.FullName.ToLower() == assignedInputLower) ||
                             assignedInputLower == "admin") &&
                            (a.OrganizationId == orgId || a.OrganizationId == null || a.OrganizationId == 0));

                    if (matchedAdmin != null)
                    {
                        dto.AssignedTo = matchedAdmin.Email;
                    }
                    else
                    {
                        throw new Exception("Assigned employee not found in this organization.");
                    }
                }
            }
            else
            {
                dto.AssignedTo = null;
            }

            // Validate Estimated Hours
            if (dto.EstimatedHours.HasValue &&
                dto.EstimatedHours <= 0)
            {
                throw new Exception("Estimated hours must be greater than zero.");
            }

            var connection = (MySqlConnection)_context.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            using var command = new MySqlCommand("SP_CreateTicket", connection);
            command.CommandType = CommandType.StoredProcedure;

            command.Parameters.AddWithValue("@p_OrganizationId", orgId);
            command.Parameters.AddWithValue("@p_ProjectId", resolvedProjectId);
            command.Parameters.AddWithValue("@p_Title", dto.Title);
            command.Parameters.AddWithValue("@p_Description", (object?)dto.Description ?? DBNull.Value);
            command.Parameters.AddWithValue("@p_Technology", dto.Technology);
            command.Parameters.AddWithValue("@p_Priority", dto.Priority);

            var assignedToParameter = command.Parameters.Add(
                "@p_AssignedTo",
                MySqlDbType.VarChar,
                50);
            assignedToParameter.Value = (object?)dto.AssignedTo ?? DBNull.Value;

            // Ticket creator (logged-in employee or admin)
            command.Parameters.AddWithValue("@p_AssignedBy", creatorId);

            command.Parameters.AddWithValue("@p_StartDate", (object?)dto.StartDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@p_DueDate", (object?)dto.DueDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@p_EstimatedHours", (object?)dto.EstimatedHours ?? DBNull.Value);

            using var reader = await command.ExecuteReaderAsync();

            var response = new CreateTicketResponseDto();

            if (await reader.ReadAsync())
            {
                response.Success = true;

                response.TicketId =
                    Convert.ToInt32(reader["TicketId"]);

                response.TicketNumber =
                    reader["TicketNumber"]?.ToString()
                    ?? string.Empty;

                response.Message =
                    "Ticket created successfully.";
            }
            else
            {
                response.Success = false;

                response.Message =
                    "Ticket creation failed.";
            }
            await reader.CloseAsync();

            var createdTicket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == response.TicketId);

            if (createdTicket != null)
            {
                if (createdTicket.OrganizationId != orgId)
                {
                    createdTicket.OrganizationId = orgId;
                    await _context.SaveChangesAsync();
                }
                await SendTicketAssignedEmail(createdTicket);
            }

            return response;
        }

        private async Task SendTicketAssignedEmail(Ticket ticket)
        {
            if (string.IsNullOrWhiteSpace(ticket.AssignedTo))
                return;

            var assignedEmployee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == ticket.AssignedTo && e.OrganizationId == ticket.OrganizationId);

            if (assignedEmployee == null || string.IsNullOrWhiteSpace(assignedEmployee.Email))
                return;

            var assignedByEmployee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == ticket.AssignedBy && e.OrganizationId == ticket.OrganizationId);

            string assignedBy = assignedByEmployee?.Name;
            if (string.IsNullOrWhiteSpace(assignedBy))
            {
                var admin = await _context.Admins
                    .FirstOrDefaultAsync(a => a.Email == ticket.AssignedBy && (a.OrganizationId == ticket.OrganizationId || a.OrganizationId == null || a.OrganizationId == 0));
                assignedBy = !string.IsNullOrWhiteSpace(admin?.FullName) ? admin.FullName : ticket.AssignedBy;
            }

            string subject = $"New Ticket Assigned - {ticket.TicketNumber}";

            string body = $@"
<html>
<body style='font-family:Segoe UI,Arial,sans-serif;'>

<h2 style='color:#0d6efd;'>
New Ticket Assigned
</h2>

<p>Hello <b>{assignedEmployee.Name}</b>,</p>

<p>
A new ticket has been assigned to you in the Employee Management System.
</p>

<table style='border-collapse:collapse;' cellpadding='8' border='1'>

<tr>
<td><b>Ticket Number</b></td>
<td>{ticket.TicketNumber}</td>
</tr>

<tr>
<td><b>Title</b></td>
<td>{ticket.Title}</td>
</tr>

<tr>
<td><b>Technology</b></td>
<td>{ticket.Technology}</td>
</tr>

<tr>
<td><b>Priority</b></td>
<td>{ticket.Priority}</td>
</tr>

<tr>
<td><b>Status</b></td>
<td>{ticket.Status}</td>
</tr>

<tr>
<td><b>Assigned By</b></td>
<td>{assignedBy}</td>
</tr>

<tr>
<td><b>Created On</b></td>
<td>{ticket.CreatedAt:dd-MMM-yyyy hh:mm tt}</td>
</tr>

<tr>
<td><b>Start Date</b></td>
<td>{ticket.StartDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
</tr>

<tr>
<td><b>Due Date</b></td>
<td>{ticket.DueDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
</tr>

<tr>
<td><b>Estimated Hours</b></td>
<td>{ticket.EstimatedHours ?? 0}</td>
</tr>

<tr>
<td><b>Description</b></td>
<td>{ticket.Description}</td>
</tr>

</table>

<br/>

<p>
Please log in to the EMS portal and update the ticket status accordingly.
</p>

<br/>

<p>
Regards,<br/>
EMS Team
</p>

</body>
</html>";

            await _emailService.SendEmailAsync(
                assignedEmployee.Email,
                subject,
                body);
        }

        public async Task<IEnumerable<TicketResponseDto>> GetAllTickets()
        {
            int orgId = GetCurrentOrgId();

            var normalTickets =
                await (
                    from t in _context.Tickets

                    join p in _context.Projects
                        on t.ProjectId equals p.Id

                    join assignedTo in _context.Employees
                        on t.AssignedTo equals assignedTo.Employee_Id into assignedToGroup
                    from assignedTo in assignedToGroup.DefaultIfEmpty()

                    join assignedBy in _context.Employees
                        on t.AssignedBy equals assignedBy.Employee_Id into assignedByGroup
                    from assignedBy in assignedByGroup.DefaultIfEmpty()

                    where t.IsActive
                          && t.OrganizationId == orgId
                          && !t.Technology.Equals("Training")

                    select new TicketResponseDto
                    {
                        Id = t.Id,
                        TicketNumber = t.TicketNumber,

                        ProjectId = t.ProjectId,
                        ProjectName = p.Project_Name,

                        Title = t.Title,
                        Description = t.Description,

                        Technology = t.Technology,
                        Module = t.Module,

                        Priority = t.Priority,
                        Status = t.Status,

                        AssignedTo = t.AssignedTo,
                        AssignedToName = assignedTo != null ? assignedTo.Name : null,

                        AssignedBy = t.AssignedBy,
                        AssignedByName = assignedBy != null ? assignedBy.Name : t.AssignedBy,

                        AssignedDate = t.AssignedDate,
                        OpenedDate = t.OpenedDate,
                        CompletedDate = t.CompletedDate,

                        StartDate = t.StartDate,
                        DueDate = t.DueDate,
                        Deadline = t.Deadline,

                        EstimatedHours = t.EstimatedHours,
                        ActualHours = t.ActualHours,
                        RemainingHours = t.RemainingHours,

                        SLAStatus = t.SLAStatus,

                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt
                    }
                ).ToListAsync();

            var trainingTickets =
                await (
                    from t in _context.Tickets

                    join p in _context.Projects
                        on t.ProjectId equals p.Id

                    join ta in _context.TicketAssignments
                        on t.Id equals ta.TicketId

                    join assignedTo in _context.Employees
                        on ta.EmployeeId equals assignedTo.Employee_Id

                    join assignedBy in _context.Employees
                        on t.AssignedBy equals assignedBy.Employee_Id into assignedByGroup
                    from assignedBy in assignedByGroup.DefaultIfEmpty()

                    where t.IsActive
                          && t.OrganizationId == orgId
                          && t.Technology == "Training"

                    select new TicketResponseDto
                    {
                        Id = t.Id,
                        TicketNumber = t.TicketNumber,

                        ProjectId = t.ProjectId,
                        ProjectName = p.Project_Name,

                        Title = t.Title,
                        Description = t.Description,

                        Technology = t.Technology,
                        Module = t.Module,

                        Priority = t.Priority,
                        Status = ta.Status,     // Assignment status

                        AssignedTo = ta.EmployeeId,
                        AssignedToName = assignedTo.Name,

                        AssignedBy = t.AssignedBy,
                        AssignedByName = assignedBy != null ? assignedBy.Name : t.AssignedBy,

                        AssignedDate = ta.AssignedDate,

                        OpenedDate = t.OpenedDate,
                        CompletedDate = t.CompletedDate,

                        StartDate = t.StartDate,
                        DueDate = t.DueDate,
                        Deadline = t.Deadline,

                        EstimatedHours = t.EstimatedHours,
                        ActualHours = t.ActualHours,
                        RemainingHours = t.RemainingHours,

                        SLAStatus = t.SLAStatus,

                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt
                    }
                ).ToListAsync();

            // Convert UTC timestamps to IST for API response
            foreach (var ticket in normalTickets)
            {
                if (ticket.AssignedDate.HasValue)
                    ticket.AssignedDate = ConvertUtcToIst(ticket.AssignedDate.Value);

                if (ticket.OpenedDate.HasValue)
                    ticket.OpenedDate = ConvertUtcToIst(ticket.OpenedDate.Value);

                if (ticket.CompletedDate.HasValue)
                    ticket.CompletedDate = ConvertUtcToIst(ticket.CompletedDate.Value);

                // CreatedAt is DateTime (non-nullable)
                ticket.CreatedAt = ConvertUtcToIst(ticket.CreatedAt);

                // UpdatedAt is DateTime? (nullable)
                if (ticket.UpdatedAt.HasValue)
                    ticket.UpdatedAt = ConvertUtcToIst(ticket.UpdatedAt.Value);
            }

            foreach (var ticket in trainingTickets)
            {
                if (ticket.AssignedDate.HasValue)
                    ticket.AssignedDate = ConvertUtcToIst(ticket.AssignedDate.Value);

                if (ticket.OpenedDate.HasValue)
                    ticket.OpenedDate = ConvertUtcToIst(ticket.OpenedDate.Value);

                if (ticket.CompletedDate.HasValue)
                    ticket.CompletedDate = ConvertUtcToIst(ticket.CompletedDate.Value);

                // CreatedAt is DateTime (non-nullable)
                ticket.CreatedAt = ConvertUtcToIst(ticket.CreatedAt);

                // UpdatedAt is DateTime? (nullable)
                if (ticket.UpdatedAt.HasValue)
                    ticket.UpdatedAt = ConvertUtcToIst(ticket.UpdatedAt.Value);
            }

            return normalTickets
                .Concat(trainingTickets)
                .OrderByDescending(x => x.CreatedAt)
                .ToList();
        }

        public async Task<TicketResponseDto?> GetTicketById(int id)
        {
            int orgId = GetCurrentOrgId();

            var ticket = await
                (
                    from t in _context.Tickets

                    join p in _context.Projects
                        on t.ProjectId equals p.Id into projectGroup
                    from p in projectGroup.DefaultIfEmpty()

                    join e1 in _context.Employees
                        on t.AssignedTo equals e1.Employee_Id into assignedToGroup
                    from e1 in assignedToGroup.DefaultIfEmpty()

                    join e2 in _context.Employees
                        on t.AssignedBy equals e2.Employee_Id into assignedByGroup
                    from e2 in assignedByGroup.DefaultIfEmpty()

                    where t.Id == id && t.OrganizationId == orgId && t.IsActive

                    select new TicketResponseDto
                    {
                        Id = t.Id,
                        TicketNumber = t.TicketNumber,
                        ProjectId = t.ProjectId,
                        ProjectName = p != null ? p.Project_Name : null,
                        Title = t.Title,
                        Description = t.Description,
                        Technology = t.Technology,
                        Priority = t.Priority,

                        Status = t.Technology == "Training"
                            ? _context.TicketAssignments
                                .Where(x =>
                                    x.TicketId == t.Id &&
                                    x.EmployeeId == t.AssignedTo)
                                .Select(x => x.Status)
                                .FirstOrDefault() ?? t.Status
                            : t.Status,

                        AssignedTo = t.AssignedTo,
                        AssignedToName = e1 != null ? e1.Name : null,

                        AssignedBy = t.AssignedBy,
                        AssignedByName = e2 != null ? e2.Name : t.AssignedBy,

                        // Ticket timestamps
                        AssignedDate = t.AssignedDate,
                        OpenedDate = t.OpenedDate,
                        CompletedDate = t.CompletedDate,

                        StartDate = t.StartDate,
                        DueDate = t.DueDate,
                        EstimatedHours = t.EstimatedHours,

                        ActualHours = t.ActualHours,
                        RemainingHours = t.RemainingHours,

                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt,
                    }
                )
                .FirstOrDefaultAsync();

            if (ticket == null)
                return null;

            // Convert UTC timestamps to IST
            if (ticket.AssignedDate.HasValue)
                ticket.AssignedDate =
                    ConvertUtcToIst(ticket.AssignedDate.Value);

            if (ticket.OpenedDate.HasValue)
                ticket.OpenedDate =
                    ConvertUtcToIst(ticket.OpenedDate.Value);

            if (ticket.CompletedDate.HasValue)
                ticket.CompletedDate =
                    ConvertUtcToIst(ticket.CompletedDate.Value);

            ticket.CreatedAt =
                ConvertUtcToIst(ticket.CreatedAt);

            if (ticket.UpdatedAt.HasValue)
                ticket.UpdatedAt =
                    ConvertUtcToIst(ticket.UpdatedAt.Value);

            // ==========================================
            // GET ALL TICKET REMARKS
            // Latest remark/date-time first
            // ==========================================

            var remarks = await _context.TicketHistory
                .AsNoTracking()
                .Where(x =>
                    x.TicketId == id &&
                    x.Remarks != null &&
                    x.Remarks != "")
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            ticket.Remarks = remarks
                .Select(x => new TicketRemarkDto
                {
                    EmployeeId = x.CreatedBy,
                    Remark = x.Remarks,
                    OldStatus = x.OldStatus,
                    NewStatus = x.NewStatus,
                    CreatedAt = ConvertUtcToIst(x.CreatedAt)
                })
                .ToList();

            // ==========================================
            // CALCULATE ACTUAL & REMAINING HOURS
            // ==========================================
            var workLogs = await _context.TicketWorkLogs
                .AsNoTracking()
                .Where(x => x.TicketId == id)
                .ToListAsync();

            var totalWorkedMinutes = workLogs
                .Where(x => !x.IsRunning)
                .Sum(x => x.WorkedMinutes);

            var runningLog = workLogs
                .FirstOrDefault(x => x.IsRunning);

            if (runningLog != null)
            {
                var runningMinutes = (int)(
                    DateTime.UtcNow - runningLog.StartTime
                ).TotalMinutes;

                if (runningMinutes > 0)
                    totalWorkedMinutes += runningMinutes;
            }

            ticket.ActualHours =
                Math.Round(totalWorkedMinutes / 60m, 2);

            if (ticket.EstimatedHours.HasValue)
            {
                ticket.RemainingHours =
                    Math.Max(
                        0,
                        ticket.EstimatedHours.Value -
                        ticket.ActualHours);
            }

            // ==========================================
            // GET TICKET ATTACHMENTS
            // ==========================================

            var attachments = await _context.TicketAttachments
                .AsNoTracking()
                .Where(x => x.TicketId == id)
                .OrderByDescending(x => x.UploadedAt)
                .ToListAsync();

            ticket.Attachments = attachments
                .Select(x => new TicketAttachmentDto
                {
                    Id = x.Id,
                    EmployeeId = x.EmployeeId,
                    TicketId = x.TicketId,
                    FileName = x.FileName,
                    FilePath = x.FilePath,
                    ContentType = x.ContentType,
                    FileSize = x.FileSize,
                    UploadedAt = ConvertUtcToIst(x.UploadedAt)
                })
                .ToList();

            return ticket;
        }

        public async Task<IEnumerable<TicketResponseDto>> GetMyTickets(ClaimsPrincipal user)
        {
            int orgId = GetCurrentOrgId();
            var (userId, userName, isAdmin) = await ResolveUserIdentityAsync(user, orgId);

            var tickets = await
                (
                    from t in _context.Tickets

                    join p in _context.Projects
                        on t.ProjectId equals p.Id

                    join assignedBy in _context.Employees
                        on t.AssignedBy equals assignedBy.Employee_Id into assignedByGroup
                    from assignedBy in assignedByGroup.DefaultIfEmpty()

                        // LEFT JOIN TicketAssignments
                    join ta in _context.TicketAssignments
                        on t.Id equals ta.TicketId into ticketAssignments

                    from ta in ticketAssignments.DefaultIfEmpty()

                        // LEFT JOIN Assigned Employee
                    join assignedEmployee in _context.Employees
                        on t.AssignedTo equals assignedEmployee.Employee_Id into assignedEmployees

                    from assignedEmployee in assignedEmployees.DefaultIfEmpty()

                    where t.IsActive &&
                          t.OrganizationId == orgId &&
                          (
                              // Normal Ticket
                              t.AssignedTo == userId

                              ||

                              // Training Ticket
                              ta.EmployeeId == userId

                              ||

                              // Admin creator
                              (isAdmin && t.AssignedBy == userId)
                          )

                    orderby t.CreatedAt descending

                    select new TicketResponseDto
                    {
                        Id = t.Id,
                        TicketNumber = t.TicketNumber,

                        ProjectId = t.ProjectId,
                        ProjectName = p.Project_Name,

                        Title = t.Title,
                        Description = t.Description,
                        Technology = t.Technology,
                        Priority = t.Priority,

                        Status = t.Status,

                        AssignedTo = t.AssignedTo,
                        AssignedToName = assignedEmployee != null
                                            ? assignedEmployee.Name
                                            : (t.AssignedTo == userId ? userName : null),

                        AssignedBy = t.AssignedBy,
                        AssignedByName = assignedBy != null ? assignedBy.Name : (t.AssignedBy == userId ? userName : null),

                        // Ticket timestamps
                        AssignedDate = t.AssignedDate,
                        OpenedDate = t.OpenedDate,
                        CompletedDate = t.CompletedDate,

                        StartDate = t.StartDate,
                        DueDate = t.DueDate,
                        EstimatedHours = t.EstimatedHours,

                        ActualHours = t.ActualHours,
                        RemainingHours = t.RemainingHours,

                        CreatedAt = t.CreatedAt,
                        UpdatedAt = t.UpdatedAt
                    }
                )
                .Distinct()
                .ToListAsync();

            // Convert UTC timestamps to IST
            foreach (var ticket in tickets)
            {
                if (ticket.AssignedDate.HasValue)
                    ticket.AssignedDate =
                        ConvertUtcToIst(ticket.AssignedDate.Value);

                if (ticket.OpenedDate.HasValue)
                    ticket.OpenedDate =
                        ConvertUtcToIst(ticket.OpenedDate.Value);

                if (ticket.CompletedDate.HasValue)
                    ticket.CompletedDate =
                        ConvertUtcToIst(ticket.CompletedDate.Value);

                // CreatedAt is DateTime
                ticket.CreatedAt =
                    ConvertUtcToIst(ticket.CreatedAt);

                // UpdatedAt is DateTime?
                if (ticket.UpdatedAt.HasValue)
                    ticket.UpdatedAt =
                        ConvertUtcToIst(ticket.UpdatedAt.Value);
            }

            // ==========================================
            // CALCULATE ACTUAL & REMAINING HOURS
            // ==========================================

            foreach (var ticket in tickets)
            {
                var workLogs = await _context.TicketWorkLogs
                    .AsNoTracking()
                    .Where(x => x.TicketId == ticket.Id)
                    .ToListAsync();

                var totalWorkedMinutes = workLogs
                    .Where(x => !x.IsRunning)
                    .Sum(x => x.WorkedMinutes);

                var runningLog = workLogs
                    .FirstOrDefault(x => x.IsRunning);

                if (runningLog != null)
                {
                    var runningMinutes = (int)(
                        DateTime.UtcNow - runningLog.StartTime
                    ).TotalMinutes;

                    if (runningMinutes > 0)
                        totalWorkedMinutes += runningMinutes;
                }

                ticket.ActualHours =
                    Math.Round(totalWorkedMinutes / 60m, 2);

                if (ticket.EstimatedHours.HasValue)
                {
                    ticket.RemainingHours =
                        Math.Max(
                            0,
                            ticket.EstimatedHours.Value -
                            ticket.ActualHours);
                }
            }

            return tickets;
        }

        public async Task<string> UpdateTicketStatus(
            int ticketId,
            string status,
            string? remarks,
            ClaimsPrincipal user)
        {
            int orgId = GetCurrentOrgId();

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == ticketId &&
                    x.OrganizationId == orgId &&
                    x.IsActive);

            if (ticket == null)
                throw new Exception("Ticket not found.");

            // Remarks are mandatory for every status except Completed
            if (!string.Equals(
                    status,
                    "Completed",
                    StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrWhiteSpace(remarks))
            {
                throw new Exception(
                    "Remarks are required when changing the ticket status.");
            }

            var oldStatus = ticket.Status;

            // Update status
            ticket.Status = status;
            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Get logged-in user - Scoped to Organization
            var (modifierId, modifierName, isAdmin) = await ResolveUserIdentityAsync(user, orgId);

            // ==========================================
            // TICKET ATTACHMENT UPLOAD
            // ==========================================

            var files = _httpContextAccessor.HttpContext?
                .Request.Form.Files;

            if (files != null && files.Count > 0)
            {
                var allowedExtensions = new[]
                {
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp",
                    ".bmp",

                    ".pdf",
                    ".doc",
                    ".docx",
                    ".txt",

                    ".xls",
                    ".xlsx",

                    ".ppt",
                    ".pptx",

                    ".csv",
                    ".zip"
                };

                var uploadFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "uploads",
                    "tickets",
                    modifierId);

                if (!Directory.Exists(uploadFolder))
                {
                    Directory.CreateDirectory(uploadFolder);
                }

                foreach (var file in files)
                {
                    if (file == null || file.Length == 0)
                        continue;

                    var extension = Path.GetExtension(file.FileName)
                        .ToLowerInvariant();

                    if (!allowedExtensions.Contains(extension))
                    {
                        throw new Exception(
                            $"File type '{extension}' is not allowed.");
                    }

                    // Maximum 10 MB per file
                    if (file.Length > 10 * 1024 * 1024)
                    {
                        throw new Exception(
                            $"File '{file.FileName}' exceeds the maximum size of 10 MB.");
                    }

                    var uniqueFileName =
                        $"{Guid.NewGuid()}{extension}";

                    var physicalPath = Path.Combine(
                        uploadFolder,
                        uniqueFileName);

                    using (var stream = new FileStream(
                        physicalPath,
                        FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    var attachment = new TicketAttachment
                    {
                        TicketId = ticket.Id,
                        EmployeeId = modifierId,
                        FileName = file.FileName,
                        FilePath =
                            $"/uploads/tickets/{modifierId}/{uniqueFileName}",
                        ContentType = file.ContentType,
                        FileSize = file.Length,
                        UploadedAt = DateTime.UtcNow
                    };

                    _context.TicketAttachments.Add(attachment);
                }

                await _context.SaveChangesAsync();
            }

            // Save status-change history with remarks
            var history = new TicketHistory
            {
                TicketId = ticket.Id,
                EmployeeId = ticket.AssignedTo,
                Action = "Status Change",
                OldStatus = oldStatus,
                NewStatus = status,
                Remarks = remarks,
                CreatedBy = modifierId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TicketHistory.Add(history);

            await _context.SaveChangesAsync();

            return "Ticket status updated successfully.";
        }

        public async Task<string> UpdateTicket(
            int ticketId,
            UpdateTicketDto dto,
            ClaimsPrincipal user)
        {
            int orgId = GetCurrentOrgId();
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Invalid user.");

            // Resolve user identity (Supports both Admin and Employee)
            var (modifierId, modifierName, isAdmin) = await ResolveUserIdentityAsync(user, orgId);

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == ticketId && x.OrganizationId == orgId && x.IsActive);

            if (ticket == null)
                throw new Exception("Ticket not found.");

            var oldAssignedTo = ticket.AssignedTo;

            int targetProjectId = dto.ProjectId > 0 ? dto.ProjectId : ticket.ProjectId;
            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.Id == targetProjectId && x.OrganizationId == orgId);

            if (project == null)
            {
                project = await _context.Projects.FirstOrDefaultAsync(x => x.OrganizationId == orgId);
            }

            if (project == null)
            {
                project = new Project
                {
                    OrganizationId = orgId,
                    Project_Name = "General",
                    Project_Id = $"PRJ-{orgId}-GEN",
                    ProjectCode = "GEN",
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Projects.Add(project);
                await _context.SaveChangesAsync();
            }

            targetProjectId = project.Id;
            dto.ProjectId = targetProjectId;

            // Validate assigned employee - Scoped to Organization
            if (!string.IsNullOrWhiteSpace(dto.AssignedTo) &&
                !dto.AssignedTo.Equals("null", StringComparison.OrdinalIgnoreCase) &&
                !dto.AssignedTo.Equals("undefined", StringComparison.OrdinalIgnoreCase) &&
                !dto.AssignedTo.Equals("unassigned", StringComparison.OrdinalIgnoreCase))
            {
                var assignedInput = dto.AssignedTo.Trim();
                var assignedInputLower = assignedInput.ToLower();

                var cleanInput = assignedInput;
                if (cleanInput.Contains(" - "))
                {
                    cleanInput = cleanInput.Split(" - ")[0].Trim();
                }
                else if (cleanInput.Contains("(") && cleanInput.Contains(")"))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(cleanInput, @"\(([^)]+)\)");
                    if (match.Success)
                    {
                        cleanInput = match.Groups[1].Value.Trim();
                    }
                }

                var orgAdminIds = await _context.Admins
                    .AsNoTracking()
                    .Where(a => a.OrganizationId == orgId)
                    .Select(a => a.Id)
                    .ToListAsync();

                var assignedEmployee = await _context.Employees
                    .FirstOrDefaultAsync(x =>
                        (x.Employee_Id == cleanInput ||
                         x.Employee_Id.ToLower() == cleanInput.ToLower() ||
                         x.Employee_Id == assignedInput ||
                         x.Employee_Id.ToLower() == assignedInputLower ||
                         (x.Name != null && (x.Name == assignedInput || x.Name.ToLower() == assignedInputLower)) ||
                         (x.Email != null && (x.Email == assignedInput || x.Email.ToLower() == assignedInputLower))) &&
                        (x.OrganizationId == orgId || (x.AdminId.HasValue && orgAdminIds.Contains(x.AdminId.Value))));

                if (assignedEmployee != null)
                {
                    dto.AssignedTo = assignedEmployee.Employee_Id;
                }
                else
                {
                    var matchedAdmin = await _context.Admins
                        .FirstOrDefaultAsync(a =>
                            (a.Email.ToLower() == assignedInputLower ||
                             (a.FullName != null && a.FullName.ToLower() == assignedInputLower) ||
                             assignedInputLower == "admin") &&
                            (a.OrganizationId == orgId || a.OrganizationId == null || a.OrganizationId == 0));

                    if (matchedAdmin != null)
                    {
                        dto.AssignedTo = matchedAdmin.Email;
                    }
                    else
                    {
                        throw new Exception("Assigned employee not found in this organization.");
                    }
                }
            }
            else
            {
                dto.AssignedTo = null;
            }

            bool isTransfer =
                !string.IsNullOrWhiteSpace(oldAssignedTo) &&
                !string.IsNullOrWhiteSpace(dto.AssignedTo) &&
                !string.Equals(
                    oldAssignedTo,
                    dto.AssignedTo,
                    StringComparison.OrdinalIgnoreCase);

            if (dto.StartDate.HasValue &&
                dto.DueDate.HasValue &&
                dto.DueDate.Value.Date < dto.StartDate.Value.Date)
            {
                throw new Exception("Due Date cannot be earlier than Start Date.");
            }

            if (dto.EstimatedHours.HasValue &&
                dto.EstimatedHours <= 0)
            {
                throw new Exception("Estimated hours must be greater than zero.");
            }

            ticket.ProjectId = targetProjectId;
            ticket.Title = dto.Title;
            ticket.Description = dto.Description;
            ticket.Technology = dto.Technology;
            ticket.Priority = dto.Priority;
            ticket.AssignedTo = dto.AssignedTo;
            ticket.StartDate = dto.StartDate;
            ticket.DueDate = dto.DueDate;
            ticket.EstimatedHours = dto.EstimatedHours;

            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            if (isTransfer)
            {
                var transferHistory = new TicketHistory
                {
                    TicketId = ticket.Id,
                    EmployeeId = dto.AssignedTo,
                    Action = "Transfer",
                    OldStatus = ticket.Status,
                    NewStatus = ticket.Status,
                    Remarks = dto.Remarks,
                    TransferFromEmployeeId = oldAssignedTo,
                    TransferToEmployeeId = dto.AssignedTo,
                    CreatedBy = modifierId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.TicketHistory.Add(transferHistory);

                await _context.SaveChangesAsync();
            }

            return "Ticket updated successfully.";
        }

        public async Task<bool> DeleteTicket(int ticketId)
        {
            int orgId = GetCurrentOrgId();

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == ticketId && x.OrganizationId == orgId);

            if (ticket == null)
                return false;

            ticket.IsActive = false;
            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<byte[]> ExportTicketsToExcel()
        {
            return await ExportTicketsToExcelForProject(null);
        }

        public async Task<byte[]> ExportTicketsToExcel(int projectId)
        {
            return await ExportTicketsToExcelForProject(new List<int> { projectId });
        }

        public async Task<byte[]> ExportTicketsToExcel(List<int> projectIds)
        {
            return await ExportTicketsToExcelForProject(projectIds);
        }

        private async Task<byte[]> ExportTicketsToExcelForProject(List<int>? projectIds)
        {
            int orgId = GetCurrentOrgId();

            var selectedProjectIds = projectIds?.Distinct().ToList();

            bool filterByProjects =
                selectedProjectIds != null && selectedProjectIds.Count > 0;

            var tickets = await
            (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join assignedTo in _context.Employees
                    on t.AssignedTo equals assignedTo.Employee_Id into assignedToGroup
                from assignedTo in assignedToGroup.DefaultIfEmpty()

                join assignedBy in _context.Employees
                    on t.AssignedBy equals assignedBy.Employee_Id into assignedByGroup
                from assignedBy in assignedByGroup.DefaultIfEmpty()

                where t.IsActive && t.OrganizationId == orgId &&
                      (!filterByProjects || selectedProjectIds!.Contains(t.ProjectId))

                orderby t.CreatedAt descending

                select new
                {
                    t.TicketNumber,
                    Project = p.Project_Name,
                    t.Title,
                    t.Description,
                    t.Technology,
                    t.Priority,
                    t.Status,
                    AssignedTo = assignedTo != null ? assignedTo.Name : "-",
                    AssignedBy = assignedBy != null ? assignedBy.Name : "-",
                    t.StartDate,
                    t.DueDate,
                    t.EstimatedHours,
                    t.ActualHours,
                    t.CompletedDate,
                    t.CreatedAt
                }
            ).ToListAsync();

            var transferHistory = await (
                from th in _context.TicketHistory
                join t in _context.Tickets on th.TicketId equals t.Id
                where th.Action == "Transfer" && t.OrganizationId == orgId &&
                      (!filterByProjects || selectedProjectIds!.Contains(t.ProjectId))
                orderby th.CreatedAt descending
                select th
            ).AsNoTracking().ToListAsync();

            using var workbook = new XLWorkbook();

            var transferWorksheet = workbook.Worksheets.Add("Ticket Transfers");
            transferWorksheet.Cell(1, 1).Value = "Ticket Number";
            transferWorksheet.Cell(1, 2).Value = "From Employee";
            transferWorksheet.Cell(1, 3).Value = "To Employee";
            transferWorksheet.Cell(1, 4).Value = "Remarks";
            transferWorksheet.Cell(1, 5).Value = "Transferred By";
            transferWorksheet.Cell(1, 6).Value = "Transfer Date (IST)";

            var worksheet = workbook.Worksheets.Add("Tickets");

            // Headers
            worksheet.Cell(1, 1).Value = "Ticket Number";
            worksheet.Cell(1, 2).Value = "Project";
            worksheet.Cell(1, 3).Value = "Title";
            worksheet.Cell(1, 4).Value = "Description";
            worksheet.Cell(1, 5).Value = "Technology";
            worksheet.Cell(1, 6).Value = "Priority";
            worksheet.Cell(1, 7).Value = "Status";
            worksheet.Cell(1, 8).Value = "Assigned To";
            worksheet.Cell(1, 9).Value = "Assigned By";
            worksheet.Cell(1, 10).Value = "Start Date";
            worksheet.Cell(1, 11).Value = "Due Date";
            worksheet.Cell(1, 12).Value = "Estimated Hours";
            worksheet.Cell(1, 13).Value = "Actual Hours";
            worksheet.Cell(1, 14).Value = "Time Taken";
            worksheet.Cell(1, 15).Value = "Created At (IST)";
            worksheet.Cell(1, 16).Value = "Completed At (IST)";

            // Header Style
            var transferHeader = transferWorksheet.Range(1, 1, 1, 6);

            transferHeader.Style.Font.Bold = true;
            transferHeader.Style.Alignment.Horizontal =
                XLAlignmentHorizontalValues.Center;
            transferHeader.Style.Fill.BackgroundColor =
                XLColor.LightBlue;

            int row = 2;

            foreach (var ticket in tickets)
            {
                worksheet.Cell(row, 1).Value = ticket.TicketNumber;
                worksheet.Cell(row, 2).Value = ticket.Project;
                worksheet.Cell(row, 3).Value = ticket.Title;
                worksheet.Cell(row, 4).Value = ticket.Description;
                worksheet.Cell(row, 5).Value = ticket.Technology;
                worksheet.Cell(row, 6).Value = ticket.Priority;
                worksheet.Cell(row, 7).Value = ticket.Status;
                worksheet.Cell(row, 8).Value = ticket.AssignedTo;
                worksheet.Cell(row, 9).Value = ticket.AssignedBy;
                worksheet.Cell(row, 10).Value = ticket.StartDate;
                worksheet.Cell(row, 11).Value = ticket.DueDate;
                worksheet.Cell(row, 12).Value = ticket.EstimatedHours;
                worksheet.Cell(row, 13).Value = ticket.ActualHours;

                // Time actually spent working on the ticket
                int totalMinutes = (int)Math.Round(ticket.ActualHours * 60);

                int hours = totalMinutes / 60;
                int minutes = totalMinutes % 60;

                worksheet.Cell(row, 14).Value = $"{hours}h {minutes}m";

                // Created At in IST
                worksheet.Cell(row, 15).Value =
                    ConvertUtcToIst(ticket.CreatedAt);

                // Completed At in IST
                if (ticket.CompletedDate.HasValue)
                {
                    worksheet.Cell(row, 16).Value =
                        ConvertUtcToIst(ticket.CompletedDate.Value);
                }
                else
                {
                    worksheet.Cell(row, 16).Value = "-";
                }

                row++;
            }

            int transferRow = 2;

            foreach (var transfer in transferHistory)
            {
                var ticket = await _context.Tickets
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == transfer.TicketId && x.OrganizationId == orgId);

                if (ticket == null)
                    continue;

                var fromEmployee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == transfer.TransferFromEmployeeId &&
                        x.OrganizationId == orgId);

                var toEmployee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == transfer.TransferToEmployeeId &&
                        x.OrganizationId == orgId);

                var transferredBy = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == transfer.CreatedBy &&
                        x.OrganizationId == orgId);

                transferWorksheet.Cell(transferRow, 1).Value =
                    ticket.TicketNumber;

                transferWorksheet.Cell(transferRow, 2).Value =
                    fromEmployee?.Name ?? transfer.TransferFromEmployeeId ?? "-";

                transferWorksheet.Cell(transferRow, 3).Value =
                    toEmployee?.Name ?? transfer.TransferToEmployeeId ?? "-";

                transferWorksheet.Cell(transferRow, 4).Value =
                    transfer.Remarks ?? "-";

                transferWorksheet.Cell(transferRow, 5).Value =
                    transferredBy?.Name ?? transfer.CreatedBy ?? "-";

                transferWorksheet.Cell(transferRow, 6).Value =
                    ConvertUtcToIst(transfer.CreatedAt);

                transferRow++;
            }

            transferWorksheet.Column(6).Style.DateFormat.Format =
                "dd-MMM-yyyy hh:mm AM/PM";

            transferWorksheet.Columns().AdjustToContents();
            worksheet.Columns().AdjustToContents();
            worksheet.Column(15).Style.DateFormat.Format =
                "dd-MMM-yyyy hh:mm AM/PM";

            worksheet.Column(16).Style.DateFormat.Format =
                "dd-MMM-yyyy hh:mm AM/PM";

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }

        public async Task<BulkUploadResultDto> BulkUploadTickets(
            IFormFile file,
            ClaimsPrincipal user)
        {
            int orgId = GetCurrentOrgId();
            var result = new BulkUploadResultDto();

            // Resolve caller identity (Supports both Admin and Employee)
            var (uploaderId, uploaderName, isAdmin) = await ResolveUserIdentityAsync(user, orgId);

            if (file == null || file.Length == 0)
                throw new Exception("Please select an Excel file.");

            using var stream = new MemoryStream();

            await file.CopyToAsync(stream);

            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);

            var worksheet = workbook.Worksheet(1);

            var rows = worksheet.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                if (row.Cells(1, 9).All(c => c.IsEmpty()))
                    continue;

                result.TotalRecords++;

                try
                {
                    // ===========================================
                    // PROJECT NAME - Scoped to Organization
                    // ===========================================

                    var projectName = row.Cell(1)
                        .GetString()
                        .Trim();

                    Project? project = null;

                    if (!string.IsNullOrWhiteSpace(projectName))
                    {
                        var normalizedProjectName = projectName.ToLower();
                        project = await _context.Projects
                            .FirstOrDefaultAsync(x =>
                                x.OrganizationId == orgId &&
                                ((x.Project_Name != null && x.Project_Name.ToLower() == normalizedProjectName) ||
                                 (x.ProjectCode != null && x.ProjectCode.ToLower() == normalizedProjectName) ||
                                 (x.Project_Id != null && x.Project_Id.ToLower() == normalizedProjectName)));
                    }

                    if (project == null)
                    {
                        project = await _context.Projects
                            .FirstOrDefaultAsync(x => x.OrganizationId == orgId);
                    }

                    if (project == null)
                    {
                        string safeProjName = !string.IsNullOrWhiteSpace(projectName) ? projectName : "General";
                        project = new Project
                        {
                            OrganizationId = orgId,
                            Project_Name = safeProjName,
                            Project_Id = $"PRJ-{orgId}-GEN",
                            ProjectCode = "GEN",
                            Status = "Active",
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.Projects.Add(project);
                        await _context.SaveChangesAsync();
                    }

                    // ===========================================
                    // DTO
                    // ===========================================
                    var dto = new CreateTicketDto
                    {
                        OrganizationId = orgId,
                        ProjectId = project.Id,

                        Title = row.Cell(2)
                            .GetString()
                            .Trim(),

                        Description = row.Cell(3)
                            .GetString()
                            .Trim(),

                        Technology = row.Cell(4)
                            .GetString()
                            .Trim(),

                        Priority = row.Cell(5)
                            .GetString()
                            .Trim(),

                        Module = row.Cell(6)
                            .GetString()
                            .Trim(),

                        AssignedTo = null,

                        StartDate = ParseExcelDate(row.Cell(7)),

                        DueDate = ParseExcelDate(row.Cell(8)),

                        EstimatedHours = ParseExcelDecimal(row.Cell(9))
                    };

                    // ===========================================
                    // VALIDATION
                    // ===========================================

                    if (string.IsNullOrWhiteSpace(dto.Title))
                        throw new Exception("Title is required.");

                    if (string.IsNullOrWhiteSpace(dto.Technology))
                        throw new Exception("Technology is required.");

                    if (string.IsNullOrWhiteSpace(dto.Priority))
                        throw new Exception("Priority is required.");

                    if (dto.StartDate.HasValue &&
                        dto.DueDate.HasValue &&
                        dto.DueDate.Value.Date < dto.StartDate.Value.Date)
                    {
                        throw new Exception(
                            "Due Date cannot be earlier than Start Date.");
                    }

                    if (dto.EstimatedHours.HasValue &&
                        dto.EstimatedHours <= 0)
                    {
                        throw new Exception(
                            "Estimated Hours must be greater than zero.");
                    }

                    // ===========================================
                    // DUPLICATE CHECK - Scoped to Organization
                    // ===========================================

                    var duplicateTicket = await _context.Tickets
                        .AsNoTracking()
                        .AnyAsync(t =>
                            t.OrganizationId == orgId &&
                            t.ProjectId == dto.ProjectId &&
                            t.Title.ToLower() == dto.Title.ToLower() &&
                            t.Technology.ToLower() == dto.Technology.ToLower() &&
                            t.IsActive);

                    if (duplicateTicket)
                    {
                        throw new Exception(
                            $"Ticket already exists for Project '{projectName}', Title '{dto.Title}' and Technology '{dto.Technology}'.");
                    }

                    // ===========================================
                    // CREATE
                    // ===========================================

                    var response = await CreateTicket(dto, user);

                    if (response.Success)
                    {
                        await _assignmentEngine.AssignTicketAsync(response.TicketId);

                        result.SuccessCount++;
                    }
                    else
                    {
                        result.FailedCount++;

                        result.Errors.Add(
                            $"Row {row.RowNumber()} : {response.Message}");
                    }
                }
                catch (Exception ex)
                {
                    result.FailedCount++;

                    result.Errors.Add(
                        $"Row {row.RowNumber()} : {ex.GetBaseException().Message}");
                }
            }

            return result;
        }

        public async Task<bool> AcceptTicketAsync(AcceptTicketDto dto)
        {
            int orgId = GetCurrentOrgId();

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.OrganizationId == orgId &&
                    x.IsActive);

            if (ticket == null)
                return false;

            // Training Ticket
            if (ticket.Technology.Equals("Training",
                StringComparison.OrdinalIgnoreCase))
            {
                var assignment = await _context.TicketAssignments
                    .FirstOrDefaultAsync(x =>
                        x.TicketId == dto.TicketId &&
                        x.EmployeeId == dto.EmployeeId);

                if (assignment == null)
                    return false;

                assignment.Status = "Accepted";
                assignment.IsAccepted = true;
            }
            else
            {
                if (ticket.AssignedTo != dto.EmployeeId)
                    return false;
            }

            ticket.Status = "Accepted";
            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _assignmentEngine.SaveHistoryAsync(
                ticket.Id,
                "Accepted",
                "Assigned",
                "Accepted",
                dto.EmployeeId,
                "Ticket accepted by employee");

            return true;
        }

        private DateTime ConvertUtcToIst(DateTime utcDateTime)
        {
            TimeZoneInfo istZone = TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows()
                    ? "India Standard Time"
                    : "Asia/Kolkata");

            return TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc),
                istZone);
        }

        public async Task<bool> RejectTicketAsync(RejectTicketDto dto)
        {
            int orgId = GetCurrentOrgId();

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.OrganizationId == orgId &&
                    x.IsActive);

            if (ticket == null)
                return false;

            if (ticket.Technology.Equals("Training",
                StringComparison.OrdinalIgnoreCase))
            {
                var assignment = await _context.TicketAssignments
                    .FirstOrDefaultAsync(x =>
                        x.TicketId == dto.TicketId &&
                        x.EmployeeId == dto.EmployeeId);

                if (assignment == null)
                    return false;

                assignment.Status = "Rejected";
            }
            else
            {
                if (ticket.AssignedTo != dto.EmployeeId)
                    return false;

                ticket.Status = "Pending Assignment";
                ticket.AssignedTo = null;
            }

            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _assignmentEngine.SaveHistoryAsync(
                ticket.Id,
                "Rejected",
                "Assigned",
                "Pending Assignment",
                dto.EmployeeId,
                dto.Reason);

            return true;
        }

        public async Task<bool> StartWorkAsync(StartWorkDto dto)
        {
            int orgId = GetCurrentOrgId();

            // ==========================================
            // GET LOGGED-IN EMPLOYEE FROM JWT - Scoped to Organization
            // ==========================================

            var email = _httpContextAccessor.HttpContext?
                .User
                .FindFirst(ClaimTypes.Email)?
                .Value?
                .Trim()
                .ToLower();

            if (string.IsNullOrWhiteSpace(email))
                return false;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Email != null &&
                    x.Email.ToLower() == email &&
                    x.OrganizationId == orgId &&
                    x.Status == "Active");

            if (employee == null)
                return false;

            var employeeId = employee.Employee_Id;

            // ==========================================
            // GET TICKET - Scoped to Organization
            // ==========================================

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t =>
                    t.Id == dto.TicketId &&
                    t.OrganizationId == orgId &&
                    t.IsActive);

            if (ticket == null)
                return false;

            // ==========================================
            // CHECK ASSIGNMENT
            // ==========================================

            if (ticket.Technology.Equals(
                "Training",
                StringComparison.OrdinalIgnoreCase))
            {
                var assignment = await _context.TicketAssignments
                    .FirstOrDefaultAsync(x =>
                        x.TicketId == dto.TicketId &&
                        x.EmployeeId == employeeId);

                if (assignment == null)
                    return false;
            }
            else
            {
                // Normal ticket
                if (ticket.AssignedTo != employeeId)
                    return false;
            }

            // ==========================================
            // STATUS CHECK
            // ==========================================

            // Overdue tickets cannot be started
            if (string.Equals(
                    ticket.Status,
                    "Overdue",
                    StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            // Already running
            if (string.Equals(
                    ticket.Status,
                    "In Progress",
                    StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            // Completed / Hold / Pending / Assigned
            // tickets are allowed to be started again.

            // ==========================================
            // CHECK RUNNING WORK LOG
            // ==========================================

            var runningLog = await _context.TicketWorkLogs
                .AnyAsync(x =>
                    x.TicketId == dto.TicketId &&
                    x.EmployeeId == employeeId &&
                    x.IsRunning);

            if (runningLog)
                return false;

            // ==========================================
            // CHECK PREVIOUS WORK LOGS
            // ==========================================

            var hasPreviousWorkLogs = await _context.TicketWorkLogs
                .AnyAsync(x =>
                    x.TicketId == dto.TicketId &&
                    x.EmployeeId == employeeId &&
                    !x.IsRunning &&
                    x.WorkedMinutes > 0);

            // ==========================================
            // CREATE NEW WORK LOG
            // ==========================================

            var workLog = new TicketWorkLog
            {
                TicketId = dto.TicketId,
                EmployeeId = employeeId,
                StartTime = DateTime.UtcNow,
                IsRunning = true
            };

            _context.TicketWorkLogs.Add(workLog);

            // ==========================================
            // START / RESTART TICKET
            // ==========================================

            ticket.Status = "In Progress";

            // Only set OpenedDate when ticket is started
            // for the first time.
            if (!hasPreviousWorkLogs)
            {
                ticket.OpenedDate = DateTime.UtcNow;

                if (ticket.EstimatedHours.HasValue)
                {
                    ticket.Deadline =
                        ticket.OpenedDate.Value.AddHours(
                            (double)ticket.EstimatedHours.Value);
                }
            }

            // Ticket is no longer completed because
            // employee has reopened it for changes.
            ticket.CompletedDate = null;

            ticket.UpdatedAt = DateTime.UtcNow;

            // ==========================================
            // TRAINING TICKET ASSIGNMENT STATUS
            // ==========================================

            if (ticket.Technology.Equals(
                "Training",
                StringComparison.OrdinalIgnoreCase))
            {
                var assignment = await _context.TicketAssignments
                    .FirstOrDefaultAsync(x =>
                        x.TicketId == dto.TicketId &&
                        x.EmployeeId == employeeId);

                if (assignment != null)
                {
                    assignment.Status = "In Progress";
                }
            }

            // ==========================================
            // SAVE
            // ==========================================

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> StopWorkAsync(StopWorkDto dto)
        {
            int orgId = GetCurrentOrgId();

            // ==========================================
            // GET LOGGED-IN EMPLOYEE FROM JWT - Scoped to Organization
            // ==========================================

            var email = _httpContextAccessor.HttpContext?
                .User
                .FindFirst(ClaimTypes.Email)?
                .Value?
                .Trim()
                .ToLower();

            if (string.IsNullOrWhiteSpace(email))
                return false;

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Email != null &&
                    x.Email.ToLower() == email &&
                    x.OrganizationId == orgId &&
                    x.Status == "Active");

            if (employee == null)
                return false;

            var employeeId = employee.Employee_Id;

            // ==========================================
            // GET CURRENTLY RUNNING WORK LOG
            // ==========================================

            var workLog = await _context.TicketWorkLogs
                .FirstOrDefaultAsync(x =>
                    x.TicketId == dto.TicketId &&
                    x.EmployeeId == employeeId &&
                    x.IsRunning);

            // If there is no running work log,
            // employee has not started this ticket
            if (workLog == null)
                return false;

            // ==========================================
            // GET TICKET - Scoped to Organization
            // ==========================================

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.OrganizationId == orgId &&
                    x.IsActive);

            if (ticket == null)
                return false;

            // ==========================================
            // CHECK ASSIGNMENT
            // ==========================================

            if (string.Equals(
                ticket.Technology,
                "Training",
                StringComparison.OrdinalIgnoreCase))
            {
                var assignment = await _context.TicketAssignments
                    .FirstOrDefaultAsync(x =>
                        x.TicketId == dto.TicketId &&
                        x.EmployeeId == employeeId);

                if (assignment == null)
                    return false;

                assignment.Status = "Completed";
            }
            else
            {
                // Normal ticket
                if (ticket.AssignedTo != employeeId)
                    return false;
            }

            // ==========================================
            // STOP CURRENT WORK LOG
            // ==========================================

            workLog.EndTime = DateTime.UtcNow;
            workLog.IsRunning = false;
            workLog.Remarks = dto.Remarks;

            workLog.WorkedMinutes =
                (int)(workLog.EndTime.Value - workLog.StartTime)
                .TotalMinutes;

            // Prevent negative worked minutes
            if (workLog.WorkedMinutes < 0)
                workLog.WorkedMinutes = 0;

            // ==========================================
            // CALCULATE TOTAL WORKED MINUTES
            // ==========================================

            var previousWorkedMinutes =
                await _context.TicketWorkLogs
                    .Where(x =>
                        x.TicketId == dto.TicketId &&
                        x.Id != workLog.Id &&
                        !x.IsRunning)
                    .SumAsync(x => (int?)x.WorkedMinutes)
                ?? 0;

            var totalWorkedMinutes =
                previousWorkedMinutes +
                workLog.WorkedMinutes;

            // ==========================================
            // UPDATE ACTUAL HOURS
            // ==========================================

            ticket.ActualHours =
                Math.Round(totalWorkedMinutes / 60m, 2);

            // ==========================================
            // UPDATE REMAINING HOURS
            // ==========================================

            if (ticket.EstimatedHours.HasValue)
            {
                ticket.RemainingHours = Math.Max(
                    0,
                    ticket.EstimatedHours.Value -
                    ticket.ActualHours);
            }

            // ==========================================
            // COMPLETION DATE
            // ==========================================

            ticket.CompletedDate = DateTime.UtcNow;

            // ==========================================
            // SLA STATUS
            // ==========================================

            if (ticket.Deadline.HasValue &&
                ticket.CompletedDate.Value > ticket.Deadline.Value)
            {
                ticket.SLAStatus = "Breached";
            }
            else
            {
                ticket.SLAStatus = "Completed";
            }

            // ==========================================
            // TICKET STATUS
            // ==========================================

            ticket.Status = "Completed";
            ticket.UpdatedAt = DateTime.UtcNow;

            // ==========================================
            // SAVE
            // ==========================================

            await _context.SaveChangesAsync();

            // ==========================================
            // SAVE HISTORY
            // ==========================================

            await _assignmentEngine.SaveHistoryAsync(
                ticket.Id,
                "Completed",
                "In Progress",
                "Completed",
                employeeId,
                "Ticket work completed by employee");

            // ==========================================
            // EMPLOYEE IS FREE
            // ASSIGN NEXT TICKET
            // ==========================================

            await _assignmentEngine
                .AssignNextTicketForEmployeeAsync(employeeId);

            return true;
        }

        public async Task<List<TicketWorkLog>> GetWorkLogsAsync(int ticketId)
        {
            int orgId = GetCurrentOrgId();

            var ticketExists = await _context.Tickets
                .AnyAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (!ticketExists)
                return new List<TicketWorkLog>();

            var workLogs = await _context.TicketWorkLogs
                .Where(x => x.TicketId == ticketId)
                .OrderByDescending(x => x.StartTime)
                .ToListAsync();

            foreach (var log in workLogs)
            {
                log.StartTime = ConvertUtcToIst(log.StartTime);

                if (log.EndTime.HasValue)
                    log.EndTime = ConvertUtcToIst(log.EndTime.Value);
            }

            return workLogs;
        }

        public async Task<List<TicketResponseDto>> GetTicketsByEmployeeIdAsync(string employeeId)
        {
            int orgId = GetCurrentOrgId();

            return await (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                // Left Join Assigned Employee
                join e in _context.Employees
                    on t.AssignedTo equals e.Employee_Id into employeeJoin
                from e in employeeJoin.DefaultIfEmpty()

                    // Left Join TicketAssignments
                join ta in _context.TicketAssignments
                    on t.Id equals ta.TicketId into assignmentJoin
                from ta in assignmentJoin.DefaultIfEmpty()

                where t.IsActive
                      && t.OrganizationId == orgId
                      &&
                      (
                          // Normal Technologies
                          t.AssignedTo == employeeId

                          ||

                          // Training Technology
                          (t.Technology == "Training"
                           && ta.EmployeeId == employeeId)
                      )

                orderby t.CreatedAt descending

                select new TicketResponseDto
                {
                    Id = t.Id,
                    TicketNumber = t.TicketNumber,

                    ProjectId = t.ProjectId,
                    ProjectName = p.Project_Name,

                    Title = t.Title,
                    Description = t.Description,

                    Technology = t.Technology,
                    Module = t.Module,

                    Priority = t.Priority,
                    Status = t.Technology == "Training"
                        ? ta.Status
                        : t.Status,

                    AssignedTo = t.Technology == "Training"
                                    ? ta.EmployeeId
                                    : t.AssignedTo,

                    AssignedToName = t.Technology == "Training"
                                        ? _context.Employees
                                            .Where(x => x.Employee_Id == ta.EmployeeId && x.OrganizationId == orgId)
                                            .Select(x => x.Name)
                                            .FirstOrDefault()
                                        : (e != null ? e.Name : null),

                    AssignedBy = t.AssignedBy,

                    AssignedDate = t.AssignedDate,
                    OpenedDate = t.OpenedDate,
                    CompletedDate = t.CompletedDate,

                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    Deadline = t.Deadline,

                    EstimatedHours = t.EstimatedHours,
                    ActualHours = t.ActualHours,
                    RemainingHours = t.RemainingHours,

                    SLAStatus = t.SLAStatus,

                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                }
            )
            .Distinct()
            .ToListAsync();
        }

        // =========================================================
        // Helper Methods
        // =========================================================

        private DateTime? ParseExcelDate(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty())
            {
                return null;
            }

            if (cell.TryGetValue<DateTime>(out var excelDate))
            {
                return excelDate;
            }

            var value = cell.GetFormattedString().Trim();

            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            string[] dateFormats =
            {
                "dd-MM-yyyy",
                "dd/MM/yyyy",
                "yyyy-MM-dd",
                "MM/dd/yyyy",
                "M/d/yyyy",
                "d/M/yyyy",
                "dd-MM-yyyy HH:mm:ss",
                "dd/MM/yyyy HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss"
            };

            if (DateTime.TryParseExact(
                value,
                dateFormats,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var exactDate))
            {
                return exactDate;
            }

            if (DateTime.TryParse(
                value,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var parsedDate))
            {
                return parsedDate;
            }

            throw new Exception(
                $"Invalid date '{value}'. Please use dd-MM-yyyy format.");
        }

        private decimal? ParseExcelDecimal(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty())
            {
                return null;
            }

            if (cell.TryGetValue<decimal>(out var decimalValue))
            {
                return decimalValue;
            }

            var value = cell.GetFormattedString().Trim();

            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            if (decimal.TryParse(
                value,
                System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture,
                out var parsedValue))
            {
                return parsedValue;
            }

            throw new Exception(
                $"Invalid estimated hours '{value}'. Please enter a numeric value.");
        }
    }
}
