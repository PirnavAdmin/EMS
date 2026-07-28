using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
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
        [HttpPost("Create")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
        {
            try
            {
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
                return NotFound();

            return Ok(result);
        }

        [HttpGet("MyTickets")]
        public async Task<IActionResult> GetMyTickets()
        {
            return Ok(await _ticketService.GetMyTickets(User));
        }

        [HttpPut("UpdateStatus/{ticketId}")]
        public async Task<IActionResult> UpdateStatus(int ticketId, [FromQuery] string status)
        {
            return Ok(await _ticketService.UpdateTicketStatus(ticketId, status, User));
        }

        [HttpDelete("{ticketId}")]
        public async Task<IActionResult> DeleteTicket(int ticketId)
        {
            var result = await _ticketService.DeleteTicket(ticketId);

            if (!result)
                return NotFound();

            return Ok("Ticket deleted successfully.");
        }

        [HttpPut("Update/{ticketId}")]
        public async Task<IActionResult> UpdateTicket(
    int ticketId,
    UpdateTicketDto dto)
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
                    Message = ex.Message,
                    StackTrace = ex.StackTrace
                });
            }
        }

        [HttpGet("Export")]
        public async Task<IActionResult> ExportTickets()
        {
            var file = await _ticketService.ExportTicketsToExcel();

            return File(
                file,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"Tickets_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
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
        public async Task<IActionResult> Accept(
    AcceptTicketDto dto)
        {
            var result =
                await _ticketService.AcceptTicketAsync(dto);

            if (!result)
                return BadRequest();

            return Ok("Ticket Accepted");
        }

        [HttpPost("reject")]
        public async Task<IActionResult> Reject(
    RejectTicketDto dto)
        {
            var result =
                await _ticketService.RejectTicketAsync(dto);

            if (!result)
                return BadRequest();

            return Ok("Ticket Rejected");
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

            // Header Style
            var header = ws.Range("A1:I1");
            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.LightBlue;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

            // Sample Data
            ws.Cell(2, 1).Value = "Employee Management System";
            ws.Cell(2, 2).Value = "Create Login API";
            ws.Cell(2, 3).Value = "Develop secure JWT Login API";
            ws.Cell(2, 4).Value = "Backend";
            ws.Cell(2, 5).Value = "High";
            ws.Cell(2, 6).Value = "Authentication";
            ws.Cell(2, 7).Value = DateTime.Today;
            ws.Cell(2, 8).Value = DateTime.Today.AddDays(5);
            ws.Cell(2, 9).Value = 8;

            // Date Format
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
            await _ticketAssignmentEngine.AutoAssignPendingTickets();

            return Ok(new
            {
                Success = true,
                Message = "Pending tickets assigned successfully."
            });
        }

        [HttpPost("{ticketId}/assign")]
        public async Task<IActionResult> AssignTicket(int ticketId)
        {
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
            var tickets = await _ticketAssignmentEngine.GetPendingTicketsAsync();

            return Ok(tickets);
        }
        [HttpGet("{ticketId}/eligible-employees")]
        public async Task<IActionResult> GetEligibleEmployees(int ticketId)
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);

            if (ticket == null)
                return NotFound("Ticket not found.");

            var employees =
                await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);

            return Ok(employees);
        }
        [HttpGet("{ticketId}/present-employees")]
        public async Task<IActionResult> GetPresentEmployees(int ticketId)
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);

            if (ticket == null)
                return NotFound();

            var eligible =
                await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);

            var present =
                await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligible);

            return Ok(present);
        }
        [HttpGet("{ticketId}/free-employees")]
        public async Task<IActionResult> GetFreeEmployees(int ticketId)
        {
            var ticket = await _context.Tickets
                .FindAsync(ticketId);

            if (ticket == null)
            {
                return NotFound("Ticket not found.");
            }

            var eligibleEmployees =
                await _ticketAssignmentEngine
                    .GetEligibleEmployeesAsync(ticket);

            var presentEmployees =
                await _ticketAssignmentEngine
                    .GetPresentEmployeesAsync(
                        eligibleEmployees);

            var freeEmployees =
                await _ticketAssignmentEngine
                    .FilterFreeEmployeesAsync(
                        presentEmployees);

            return Ok(freeEmployees);
        }
        [HttpGet("{ticketId}/module-owner")]
        public async Task<IActionResult> GetModuleOwner(int ticketId)
        {
            var ticket = await _context.Tickets.FindAsync(ticketId);

            if (ticket == null)
                return NotFound();

            var eligible =
                await _ticketAssignmentEngine.GetEligibleEmployeesAsync(ticket);

            eligible =
                await _ticketAssignmentEngine.GetPresentEmployeesAsync(eligible);

            var employee =
                await _ticketAssignmentEngine.FindModuleContinuationEmployeeAsync(
                    ticket,
                    eligible);

            return Ok(employee);
        }
        [HttpGet("{ticketId}/round-robin")]
        public async Task<IActionResult> GetRoundRobinEmployee(
    int ticketId)
        {
            var ticket = await _context.Tickets
                .FindAsync(ticketId);

            if (ticket == null)
            {
                return NotFound("Ticket not found.");
            }

            var eligibleEmployees =
                await _ticketAssignmentEngine
                    .GetEligibleEmployeesAsync(ticket);

            var presentEmployees =
                await _ticketAssignmentEngine
                    .GetPresentEmployeesAsync(
                        eligibleEmployees);

            var freeEmployees =
                await _ticketAssignmentEngine
                    .FilterFreeEmployeesAsync(
                        presentEmployees);

            if (!freeEmployees.Any())
            {
                return Ok(new
                {
                    Success = false,
                    Message =
                        "No free employee is currently available."
                });
            }

            var employee =
                await _ticketAssignmentEngine
                    .FindRoundRobinEmployeeAsync(
                        ticket,
                        freeEmployees);

            return Ok(employee);
        }

        [HttpGet("{ticketId}/history")]
        public async Task<IActionResult> GetTicketHistory(int ticketId)
        {
            var history = await _context.TicketHistory
     .Where(x => x.TicketId == ticketId)
     .OrderByDescending(x => x.CreatedAt)
     .ToListAsync();

            return Ok(history);
        }
        //[HttpGet("assignment-summary")]
        //public async Task<IActionResult> AssignmentSummary()
        //{
        //    return Ok(new
        //    {
        //        Pending = await _context.Tickets.CountAsync(x => x.Status == "Pending Assignment"),
        //        Assigned = await _context.Tickets.CountAsync(x => x.Status == "Assigned"),
        //        InProgress = await _context.Tickets.CountAsync(x => x.Status == "In Progress"),
        //        Completed = await _context.Tickets.CountAsync(x => x.Status == "Completed")
        //    });
        //}
        [HttpPost("start-work")]
        public async Task<IActionResult> StartWork(StartWorkDto dto)
        {
            var result = await _ticketService.StartWorkAsync(dto);

            if (!result)
                return BadRequest("Unable to start work.");

            return Ok("Work started successfully.");
        }

        [HttpPost("stop-work")]
        public async Task<IActionResult> StopWork(StopWorkDto dto)
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
                return NotFound("No tickets found for this employee.");

            return Ok(result);
        }
    }
}