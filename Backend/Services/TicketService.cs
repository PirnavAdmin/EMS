using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Microsoft.Extensions.Hosting;
using System.Data;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class TicketService : ITicketService
    {
        private readonly AppDbContext _context;
        private readonly IUserNotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly ITicketAssignmentEngine _assignmentEngine;
        public TicketService(
            AppDbContext context,
            IUserNotificationService notificationService,
             IEmailService emailService,
             ITicketAssignmentEngine assignmentEngine)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
            _assignmentEngine = assignmentEngine;
        }
        public async Task<CreateTicketResponseDto> CreateTicket(CreateTicketDto dto, ClaimsPrincipal user)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Invalid user.");

            // Logged-in employee (Creator of the ticket)
            var loggedInEmployee = await _context.Employees
                .FirstOrDefaultAsync(e =>
                    e.Email.ToLower() == email &&
                    e.Status == "Active");

            if (loggedInEmployee == null)
                throw new Exception("Employee not found.");

            // Validate Project
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId);

            if (project == null)
                throw new Exception("Invalid Project.");

            // Validate Assigned Employee
            // Validate Assigned Employee only when manually assigned
            Employee? assignedEmployee = null;

            if (!string.IsNullOrWhiteSpace(dto.AssignedTo))
            {
                assignedEmployee = await _context.Employees
                    .FirstOrDefaultAsync(e =>
                        e.Employee_Id == dto.AssignedTo &&
                        e.Status == "Active");

                if (assignedEmployee == null)
                {
                    throw new Exception("Assigned employee not found.");
                }
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

            command.Parameters.AddWithValue("@p_ProjectId", dto.ProjectId);
            command.Parameters.AddWithValue("@p_Title", dto.Title);
            command.Parameters.AddWithValue("@p_Description", (object?)dto.Description ?? DBNull.Value);
            command.Parameters.AddWithValue("@p_Technology", dto.Technology);
            command.Parameters.AddWithValue("@p_Priority", dto.Priority);
            var assignedToParameter = command.Parameters.Add(
     "@p_AssignedTo",
     MySqlDbType.VarChar,
     50);
            // Ticket creator (logged-in employee)
            command.Parameters.AddWithValue("@p_AssignedBy", loggedInEmployee.Employee_Id);

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
                await SendTicketAssignedEmail(createdTicket);
            }

            return response;
        }
        private async Task SendTicketAssignedEmail(Ticket ticket)
        {
            var assignedEmployee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == ticket.AssignedTo);

            if (assignedEmployee == null || string.IsNullOrWhiteSpace(assignedEmployee.Email))
                return;

            var assignedByEmployee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == ticket.AssignedBy);

            string assignedBy = assignedByEmployee?.Name ?? ticket.AssignedBy;

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
            return await
            (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join e1 in _context.Employees
                    on t.AssignedTo equals e1.Employee_Id

                join e2 in _context.Employees
                    on t.AssignedBy equals e2.Employee_Id

                where t.IsActive

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
                    AssignedToName = e1.Name,
                    AssignedBy = t.AssignedBy,
                    AssignedByName = e2.Name,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CreatedAt = t.CreatedAt
                }
            ).ToListAsync();
        }

        public async Task<TicketResponseDto?> GetTicketById(int id)
        {
            return await
            (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join e1 in _context.Employees
                    on t.AssignedTo equals e1.Employee_Id

                join e2 in _context.Employees
                    on t.AssignedBy equals e2.Employee_Id

                where t.Id == id && t.IsActive

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
                    AssignedToName = e1.Name,
                    AssignedBy = t.AssignedBy,
                    AssignedByName = e2.Name,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CreatedAt = t.CreatedAt
                }
            ).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<TicketResponseDto>> GetMyTickets(ClaimsPrincipal user)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

            var employee = await _context.Employees
                .FirstOrDefaultAsync(x => x.Email.ToLower() == email);

            if (employee == null)
                throw new Exception("Employee not found.");

            return await
            (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join assignedTo in _context.Employees
                    on t.AssignedTo equals assignedTo.Employee_Id

                join assignedBy in _context.Employees
                    on t.AssignedBy equals assignedBy.Employee_Id

                where t.AssignedTo == employee.Employee_Id
                      && t.IsActive

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
                    AssignedToName = assignedTo.Name,

                    AssignedBy = t.AssignedBy,
                    AssignedByName = assignedBy.Name,

                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    EstimatedHours = t.EstimatedHours,
                    CreatedAt = t.CreatedAt
                }
            ).ToListAsync();
        }

        public async Task<string> UpdateTicketStatus(int ticketId, string status, ClaimsPrincipal user)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == ticketId && x.IsActive);

            if (ticket == null)
                throw new Exception("Ticket not found.");

            ticket.Status = status;

            ticket.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Ticket status updated successfully.";
        }

        public async Task<string> UpdateTicket(
      int ticketId,
      UpdateTicketDto dto,
      ClaimsPrincipal user)
        {
            var email = user.FindFirst(ClaimTypes.Email)?.Value?.Trim().ToLower();

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Invalid user.");

            // Logged-in employee (No Manager role required)
            var loggedInEmployee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() == email &&
                    x.Status == "Active");

            if (loggedInEmployee == null)
                throw new Exception("Employee not found.");

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == ticketId && x.IsActive);

            if (ticket == null)
                throw new Exception("Ticket not found.");

            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.Id == dto.ProjectId);

            if (project == null)
                throw new Exception("Invalid Project.");

            // Validate assigned employee
            var assignedEmployee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == dto.AssignedTo &&
                    x.Status == "Active");

            if (assignedEmployee == null)
                throw new Exception("Assigned employee not found.");

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

            ticket.ProjectId = dto.ProjectId;
            ticket.Title = dto.Title;
            ticket.Description = dto.Description;
            ticket.Technology = dto.Technology;
            ticket.Priority = dto.Priority;
            ticket.AssignedTo = dto.AssignedTo;
            ticket.StartDate = dto.StartDate;
            ticket.DueDate = dto.DueDate;
            ticket.EstimatedHours = dto.EstimatedHours;
            ticket.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Ticket updated successfully.";
        }
        public async Task<bool> DeleteTicket(int ticketId)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x => x.Id == ticketId);

            if (ticket == null)
                return false;

            ticket.IsActive = false;

            ticket.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<byte[]> ExportTicketsToExcel()
        {
            var tickets = await
            (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join assignedTo in _context.Employees
                    on t.AssignedTo equals assignedTo.Employee_Id

                join assignedBy in _context.Employees
                    on t.AssignedBy equals assignedBy.Employee_Id

                where t.IsActive

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
                    AssignedTo = assignedTo.Name,
                    AssignedBy = assignedBy.Name,
                    t.StartDate,
                    t.DueDate,
                    t.EstimatedHours,
                    t.CreatedAt
                }

            ).ToListAsync();

            using var workbook = new XLWorkbook();

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
            worksheet.Cell(1, 13).Value = "Created At";

            // Header Style
            var header = worksheet.Range(1, 1, 1, 13);

            header.Style.Font.Bold = true;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Fill.BackgroundColor = XLColor.LightBlue;

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
                worksheet.Cell(row, 13).Value = ticket.CreatedAt;

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return stream.ToArray();
        }

        public async Task<BulkUploadResultDto> BulkUploadTickets(
     IFormFile file,
     ClaimsPrincipal user)
        {
            var result = new BulkUploadResultDto();

            var email = user.FindFirst(ClaimTypes.Email)?
                .Value?
                .Trim()
                .ToLower();

            var manager = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Email.ToLower() == email);

            if (manager == null)
            {
                throw new Exception("Manager not found.");
            }

            if (file == null || file.Length == 0)
            {
                throw new Exception("Please select an Excel file.");
            }

            using var stream = new MemoryStream();

            await file.CopyToAsync(stream);

            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);

            var worksheet = workbook.Worksheet(1);

            var rows = worksheet
                .RowsUsed()
                .Skip(1);

            foreach (var row in rows)
            {
                if (row.Cells(1, 9).All(c => c.IsEmpty()))
                {
                    continue;
                }

                result.TotalRecords++;

                try
                {
                    var dto = new CreateTicketDto
                    {
                        ProjectId = row.Cell(1)
                            .GetValue<int>(),

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

                        AssignedTo = null,

                        StartDate = ParseExcelDate(
                            row.Cell(7)),

                        DueDate = ParseExcelDate(
                            row.Cell(8)),

                        EstimatedHours = ParseExcelDecimal(
                            row.Cell(9))
                    };

                    if (string.IsNullOrWhiteSpace(dto.Title))
                    {
                        throw new Exception(
                            "Title is required.");
                    }

                    if (string.IsNullOrWhiteSpace(dto.Technology))
                    {
                        throw new Exception(
                            "Technology is required.");
                    }

                    if (string.IsNullOrWhiteSpace(dto.Priority))
                    {
                        throw new Exception(
                            "Priority is required.");
                    }

                    if (dto.StartDate.HasValue &&
                        dto.DueDate.HasValue &&
                        dto.DueDate.Value.Date <
                        dto.StartDate.Value.Date)
                    {
                        throw new Exception(
                            "Due Date cannot be earlier than Start Date.");
                    }

                    if (dto.EstimatedHours.HasValue &&
                        dto.EstimatedHours.Value <= 0)
                    {
                        throw new Exception(
                            "Estimated Hours must be greater than zero.");
                    }

                    var response = await CreateTicket(
                        dto,
                        user);
                    var duplicateTicket = await _context.Tickets
    .AsNoTracking()
    .AnyAsync(t =>
        t.ProjectId == dto.ProjectId &&
        t.Title.ToLower() == dto.Title.ToLower() &&
        t.Technology.ToLower() == dto.Technology.ToLower() &&
        t.IsActive);

                    if (duplicateTicket)
                    {
                        throw new Exception(
                            $"Ticket already exists for ProjectId " +
                            $"{dto.ProjectId}, Title '{dto.Title}' " +
                            $"and Technology '{dto.Technology}'.");
                    }
                    if (response.Success)
                    {
                        await _assignmentEngine
                            .AssignTicketAsync(
                                response.TicketId);

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
                        $"Row {row.RowNumber()} : " +
                        $"{ex.GetBaseException().Message}");
                }
            }

            return result;
        }

        public async Task<bool> AcceptTicketAsync(
    AcceptTicketDto dto)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.AssignedTo == dto.EmployeeId);

            if (ticket == null)
                return false;

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
        public async Task<bool> RejectTicketAsync(
    RejectTicketDto dto)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.AssignedTo == dto.EmployeeId);

            if (ticket == null)
                return false;

            ticket.Status = "Pending Assignment";

            ticket.AssignedTo = null;

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
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t =>
                    t.Id == dto.TicketId &&
                    t.AssignedTo == dto.EmployeeId);

            if (ticket == null)
                return false;

            if (ticket.Status == "Completed")
                return false;

            if (ticket.Status == "Overdue")
                return false;

            if (ticket.Status == "In Progress")
                return false;

            var runningLog = await _context.TicketWorkLogs
                .AnyAsync(x =>
                    x.TicketId == dto.TicketId &&
                    x.EmployeeId == dto.EmployeeId &&
                    x.IsRunning);

            if (runningLog)
                return false;

            var workLog = new TicketWorkLog
            {
                TicketId = dto.TicketId,
                EmployeeId = dto.EmployeeId,
                StartTime = DateTime.UtcNow,
                IsRunning = true
            };

            _context.TicketWorkLogs.Add(workLog);

            ticket.Status = "In Progress";

            ticket.OpenedDate = DateTime.UtcNow;

            if (ticket.EstimatedHours.HasValue)
            {
                ticket.Deadline = ticket.OpenedDate.Value.AddHours(
                    (double)ticket.EstimatedHours.Value);
            }

            ticket.UpdatedAt = DateTime.UtcNow;
            

            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<bool> StopWorkAsync(StopWorkDto dto)
        {
            var workLog = await _context.TicketWorkLogs
                .FirstOrDefaultAsync(x =>
                    x.TicketId == dto.TicketId &&
                    x.EmployeeId == dto.EmployeeId &&
                    x.IsRunning);

            if (workLog == null)
                return false;

            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.TicketId &&
                    x.AssignedTo == dto.EmployeeId &&
                    x.IsActive);

            if (ticket == null)
                return false;

            if (ticket.Status != "In Progress")
                return false;

            workLog.EndTime = DateTime.UtcNow;
            workLog.IsRunning = false;
            workLog.Remarks = dto.Remarks;

            workLog.WorkedMinutes =
                (int)(workLog.EndTime.Value - workLog.StartTime)
                .TotalMinutes;

            // Calculate total worked minutes for this ticket
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

            ticket.ActualHours =
                Math.Round(totalWorkedMinutes / 60m, 2);

            if (ticket.EstimatedHours.HasValue)
            {
                ticket.RemainingHours = Math.Max(
                    0,
                    ticket.EstimatedHours.Value -
                    ticket.ActualHours);
            }

            ticket.CompletedDate = DateTime.UtcNow;

            if (ticket.Deadline.HasValue &&
                ticket.CompletedDate.Value > ticket.Deadline.Value)
            {
                ticket.SLAStatus = "Breached";
            }
            else
            {
                ticket.SLAStatus = "Completed";
            }

            ticket.Status = "Completed";
            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _assignmentEngine.SaveHistoryAsync(
                ticket.Id,
                "Completed",
                "In Progress",
                "Completed",
                dto.EmployeeId,
                "Ticket work completed by employee");

            // Employee is now free.
            // Immediately assign next eligible ticket.
            await _assignmentEngine
                .AssignNextTicketForEmployeeAsync(
                    dto.EmployeeId);

            return true;
        }
        public async Task<List<TicketWorkLog>> GetWorkLogsAsync(int ticketId)
        {
            return await _context.TicketWorkLogs
                .Where(x => x.TicketId == ticketId)
                .OrderByDescending(x => x.StartTime)
                .ToListAsync();
        }
        public async Task<List<TicketResponseDto>> GetTicketsByEmployeeIdAsync(string employeeId)
        {
            return await (
                from t in _context.Tickets

                join p in _context.Projects
                    on t.ProjectId equals p.Id

                join e in _context.Employees
                    on t.AssignedTo equals e.Employee_Id

                where t.AssignedTo == employeeId
                      && t.IsActive

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
                    Status = t.Status,

                    AssignedTo = t.AssignedTo,
                    AssignedToName = e.Name,

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
            ).ToListAsync();
        }

        // Helper Methods

                // Helper Methods

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
    