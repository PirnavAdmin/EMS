using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize] // 🔥 Multi-tenancy enforcement requires authenticated JWT
    [Route("api/[controller]")]
    [ApiController]
    public class TicketController : ControllerBase
    {
        private readonly ITicketService _ticketService;
        private readonly ITicketAssignmentEngine _ticketAssignmentEngine;
        private readonly AppDbContext _context;

        public TicketController(
            ITicketService ticketService,
            ITicketAssignmentEngine ticketAssignmentEngine,
            AppDbContext context)
        {
            _ticketService = ticketService;
            _ticketAssignmentEngine = ticketAssignmentEngine;
            _context = context;
        }

        // 🔥 Helper to resolve current OrganizationId
        private int GetCurrentOrgId()
        {
            var orgId = CurrentUserHelper.GetOrganizationId(User);
            if (!orgId.HasValue || orgId.Value <= 0)
            {
                var (resolvedOrgId, _) = CurrentUserHelper.GetTenantContextAsync(_context, User).GetAwaiter().GetResult();
                if (resolvedOrgId.HasValue && resolvedOrgId.Value > 0)
                    return resolvedOrgId.Value;

                throw new UnauthorizedAccessException("OrganizationId not found in token.");
            }
            return orgId.Value;
        }

        [HttpPost("Create")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
        {
            try
            {
                dto.OrganizationId = GetCurrentOrgId(); // 🔥 Scoped to current org
                var result = await _ticketService.CreateTicket(dto, User);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAllTickets()
        {
            var result = await _ticketService.GetAllTickets();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTicketById(int id)
        {
            var result = await _ticketService.GetTicketById(id);
            if (result == null)
                return NotFound(new { message = "Ticket not found or access denied." });

            return Ok(result);
        }

        [HttpGet("MyTickets")]
        public async Task<IActionResult> GetMyTickets()
        {
            return Ok(await _ticketService.GetMyTickets(User));
        }

        [HttpPut("UpdateStatus/{ticketId}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateStatus(
            int ticketId,
            [FromForm] string status,
            [FromForm] string? remarks,
            [FromForm] List<IFormFile>? files)
        {
            try
            {
                var result = await _ticketService.UpdateTicketStatus(ticketId, status, remarks, User);
                return Ok(new
                {
                    Success = true,
                    Message = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpDelete("{ticketId}")]
        public async Task<IActionResult> DeleteTicket(int ticketId)
        {
            var result = await _ticketService.DeleteTicket(ticketId);
            if (!result)
                return NotFound(new { message = "Ticket not found or access denied." });

            return Ok(new { message = "Ticket deleted successfully." });
        }

        [HttpPut("Update/{ticketId}")]
        public async Task<IActionResult> UpdateTicket(int ticketId, [FromBody] UpdateTicketDto dto)
        {
            try
            {
                var result = await _ticketService.UpdateTicket(ticketId, dto, User);
                return Ok(new
                {
                    Success = true,
                    Message = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpGet("Export")]
        public async Task<IActionResult> ExportTickets(
            [FromQuery(Name = "projectIds")] List<int>? projectIds)
        {
            int orgId = GetCurrentOrgId();

            if (projectIds != null && projectIds.Count > 0)
            {
                var selectedProjectIds = projectIds.Distinct().ToList();

                if (selectedProjectIds.Any(id => id <= 0))
                {
                    return BadRequest(new
                    {
                        Success = false,
                        Message = "Project IDs must be greater than zero."
                    });
                }

                var existingProjectIds = await _context.Projects
                    .Where(p => selectedProjectIds.Contains(p.Id) && p.OrganizationId == orgId)
                    .Select(p => p.Id)
                    .ToListAsync();

                var missingProjectIds = selectedProjectIds
                    .Except(existingProjectIds)
                    .ToList();

                if (missingProjectIds.Count > 0)
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = $"Project IDs not found: {string.Join(", ", missingProjectIds)}"
                    });
                }

                var file = await _ticketService.ExportTicketsToExcel(selectedProjectIds);

                return File(
                    file,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Tickets_Projects_{string.Join("_", selectedProjectIds)}_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
            }

            // Existing Export All functionality
            var allProjectsFile = await _ticketService.ExportTicketsToExcel();

            return File(
                allProjectsFile,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Tickets_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
        }

        [HttpGet("Export/Project/{projectId:int}")]
        public async Task<IActionResult> ExportProjectTickets(int projectId)
        {
            int orgId = GetCurrentOrgId();

            var projectExists = await _context.Projects
                .AnyAsync(p => p.Id == projectId && p.OrganizationId == orgId);

            if (!projectExists)
                return NotFound(new
                {
                    Success = false,
                    Message = $"Project with ID {projectId} was not found."
                });

            var file = await _ticketService.ExportTicketsToExcel(projectId);

            return File(
                file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Tickets_Project_{projectId}_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
        }

        [HttpPost("BulkUpload")]
        public async Task<IActionResult> BulkUpload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Please upload an Excel file.");

            var result = await _ticketService.BulkUploadTickets(file, User);
            return Ok(result);
        }

        [HttpPost("accept")]
        public async Task<IActionResult> Accept([FromBody] AcceptTicketDto dto)
        {
            var result = await _ticketService.AcceptTicketAsync(dto);
            if (!result)
                return BadRequest(new { message = "Unable to accept ticket." });

            return Ok(new { message = "Ticket Accepted" });
        }

        [HttpPost("reject")]
        public async Task<IActionResult> Reject([FromBody] RejectTicketDto dto)
        {
            var result = await _ticketService.RejectTicketAsync(dto);
            if (!result)
                return BadRequest(new { message = "Unable to reject ticket." });

            return Ok(new { message = "Ticket Rejected" });
        }

        [HttpGet("DownloadTemplate")]
        public IActionResult DownloadTemplate()
        {
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Tickets");

            // Headers
            ws.Cell(1, 1).Value = "Project Name";
            ws.Cell(1, 2).Value = "Title";
            ws.Cell(1, 3).Value = "Description";
            ws.Cell(1, 4).Value = "Technology";
            ws.Cell(1, 5).Value = "Priority";
            ws.Cell(1, 6).Value = "Module";
            ws.Cell(1, 7).Value = "Start Date";
            ws.Cell(1, 8).Value = "Due Date";
            ws.Cell(1, 9).Value = "Estimated Hours";

            var header = ws.Range("A1:I1");
            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.LightBlue;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            ws.Cell(2, 1).Value = "Employee Management System";
            ws.Cell(2, 2).Value = "Create Login API";
            ws.Cell(2, 3).Value = "Develop secure JWT Login API";
            ws.Cell(2, 4).Value = "Backend";
            ws.Cell(2, 5).Value = "High";
            ws.Cell(2, 6).Value = "Authentication";
            ws.Cell(2, 7).Value = DateTime.Today;
            ws.Cell(2, 8).Value = DateTime.Today.AddDays(5);
            ws.Cell(2, 9).Value = 8;

            ws.Column(7).Style.DateFormat.Format = "dd-MM-yyyy";
            ws.Column(8).Style.DateFormat.Format = "dd-MM-yyyy";
            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "TicketTemplate.xlsx");
        }

        [HttpPost("auto-assign")]
        public async Task<IActionResult> AutoAssignTickets()
        {
            int orgId = GetCurrentOrgId();
            await _ticketAssignmentEngine.AutoAssignPendingTickets(orgId);

            return Ok(new
            {
                Success = true,
                Message = "Pending tickets assigned successfully for your organization."
            });
        }

        [HttpPost("{ticketId}/assign")]
        public async Task<IActionResult> AssignTicket(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound(new { message = "Ticket not found or access denied." });

            await _ticketAssignmentEngine.AssignTicketAsync(ticketId);

            return Ok(new
            {
                Success = true,
                Message = "Ticket assigned successfully."
            });
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingTickets()
        {
            int orgId = GetCurrentOrgId();
            var tickets = await _ticketAssignmentEngine.GetPendingTicketsAsync(orgId);
            return Ok(tickets);
        }

        [HttpGet("{ticketId}/eligible-employees")]
        public async Task<IActionResult> GetEligibleEmployees(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound("Ticket not found or access denied.");

            var employees = await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);
            return Ok(employees);
        }

        [HttpGet("{ticketId}/present-employees")]
        public async Task<IActionResult> GetPresentEmployees(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound("Ticket not found or access denied.");

            var eligible = await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);
            var present = await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligible);
            return Ok(present);
        }

        [HttpGet("{ticketId}/free-employees")]
        public async Task<IActionResult> GetFreeEmployees(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound("Ticket not found or access denied.");

            var eligibleEmployees = await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);
            var presentEmployees = await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligibleEmployees);
            var freeEmployees = await _ticketAssignmentEngine.FilterFreeEmployeesAsync(presentEmployees, orgId);

            return Ok(freeEmployees);
        }

        [HttpGet("{ticketId}/module-owner")]
        public async Task<IActionResult> GetModuleOwner(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound("Ticket not found or access denied.");

            var eligible = await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);
            eligible = await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligible);

            var employee = await _ticketAssignmentEngine.FindModuleContinuationEmployeeAsync(ticket, eligible);
            return Ok(employee);
        }

        [HttpGet("{ticketId}/round-robin")]
        public async Task<IActionResult> GetRoundRobinEmployee(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (ticket == null)
                return NotFound("Ticket not found or access denied.");

            var eligibleEmployees = await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);
            var presentEmployees = await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligibleEmployees);
            var freeEmployees = await _ticketAssignmentEngine.FilterFreeEmployeesAsync(presentEmployees, orgId);

            if (!freeEmployees.Any())
            {
                return Ok(new
                {
                    Success = false,
                    Message = "No free employee is currently available."
                });
            }

            var employee = await _ticketAssignmentEngine.FindRoundRobinEmployeeAsync(ticket, freeEmployees);
            return Ok(employee);
        }

        [HttpGet("{ticketId}/history")]
        public async Task<IActionResult> GetTicketHistory(int ticketId)
        {
            int orgId = GetCurrentOrgId();
            var ticketExists = await _context.Tickets
                .AnyAsync(t => t.Id == ticketId && t.OrganizationId == orgId && t.IsActive);

            if (!ticketExists)
                return NotFound(new { message = "Ticket not found or access denied." });

            var history = await _context.TicketHistory
                .Where(x => x.TicketId == ticketId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return Ok(history);
        }

        [HttpPost("start-work")]
        public async Task<IActionResult> StartWork([FromBody] StartWorkDto dto)
        {
            var result = await _ticketService.StartWorkAsync(dto);
            if (!result)
                return BadRequest("Unable to start work.");

            return Ok("Work started successfully.");
        }

        [HttpPost("stop-work")]
        public async Task<IActionResult> StopWork([FromBody] StopWorkDto dto)
        {
            var result = await _ticketService.StopWorkAsync(dto);
            if (!result)
                return BadRequest("Unable to stop work.");

            return Ok("Work stopped successfully.");
        }

        [HttpGet("{ticketId}/worklogs")]
        public async Task<IActionResult> GetWorkLogs(int ticketId)
        {
            var logs = await _ticketService.GetWorkLogsAsync(ticketId);
            return Ok(logs);
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetTicketsByEmployeeId(string employeeId)
        {
            var result = await _ticketService.GetTicketsByEmployeeIdAsync(employeeId);
            if (!result.Any())
                return NotFound("No tickets found for this employee in your organization.");

            return Ok(result);
        }
    }
}
