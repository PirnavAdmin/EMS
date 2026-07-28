using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class TicketAssignmentEngine : ITicketAssignmentEngine
    {
        private readonly AppDbContext _context;
        private readonly IUserNotificationService _notificationService;
        private readonly IEmailService _emailService;

        public TicketAssignmentEngine(
            AppDbContext context,
            IUserNotificationService notificationService,
            IEmailService emailService)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
        }

        // =========================================================
        // GET PENDING TICKETS
        // Accept both:
        // Pending
        // Pending Assignment
        // =========================================================
        public async Task<List<Ticket>> GetPendingTicketsAsync()
        {
            return await _context.Tickets
                .Where(t =>
                    t.IsActive
                    &&
                    (
                        t.Status == "Pending"
                        ||
                        t.Status == "Pending Assignment"
                    )
                    &&
                    (
                        // Normal Tickets
                        (
                            !t.Technology.Equals("Training") &&
                            t.AssignedTo == null
                        )

                        ||

                        // Training Tickets
                        (
                            t.Technology.Equals("Training") &&
                            !_context.TicketAssignments
                                .Any(a => a.TicketId == t.Id)
                        )
                    )
                )
                .OrderBy(t => t.CreatedAt)
                .ThenBy(t => t.Id)
                .ToListAsync();
        }

        // =========================================================
        // GET ELIGIBLE EMPLOYEES
        // Project + Technology
        // =========================================================
        public async Task<List<Employee>> GetEligibleEmployeesAsync(
            Ticket ticket)
        {
            var employeeIds = await _context.ProjectTeamMembers
                .Where(x =>
                    x.ProjectId == ticket.ProjectId &&
                    x.Technology == ticket.Technology)
                .Select(x => x.EmployeeId)
                .Distinct()
                .ToListAsync();

            return await _context.Employees
                .Where(x =>
                    employeeIds.Contains(x.Employee_Id) &&
                    x.Status == "Active")
                .ToListAsync();
        }

        // =========================================================
        // GET PRESENT EMPLOYEES
        // =========================================================
        public async Task<List<Employee>> GetPresentEmployeesAsync(
            List<Employee> employees)
        {
            if (employees == null || !employees.Any())
            {
                return new List<Employee>();
            }

            var today = DateTime.Today;

            var employeeIds = employees
                .Select(e => e.Employee_Id)
                .ToList();

            var presentEmployeeIds = await _context.Attendance
                .Where(a =>
                    employeeIds.Contains(a.Employee_Id) &&
                    a.Attendance_Date.Date == today &&
                    a.Check_In != null &&
                    (
                        a.Status == "Present" ||
                        a.Status == "Late"
                    ))
                .Select(a => a.Employee_Id)
                .Distinct()
                .ToListAsync();

            return employees
                .Where(e =>
                    presentEmployeeIds.Contains(e.Employee_Id))
                .ToList();
        }

        // =========================================================
        // FILTER FREE EMPLOYEES
        //
        // ONE EMPLOYEE = ONE ACTIVE TICKET
        //
        // Busy Status:
        // Assigned
        // Accepted
        // In Progress
        // =========================================================
        public async Task<List<Employee>> FilterFreeEmployeesAsync(
       List<Employee> employees)
        {
            if (employees == null || !employees.Any())
            {
                return new List<Employee>();
            }

            var employeeIds = employees
                .Select(e => e.Employee_Id)
                .ToList();

            // =========================================================
            // Employees busy with NORMAL tickets
            // =========================================================
            var busyNormalEmployees = await _context.Tickets
                .Where(t =>
                    t.IsActive &&
                    t.AssignedTo != null &&
                    employeeIds.Contains(t.AssignedTo) &&
                    (
                        t.Status == "Assigned" ||
                        t.Status == "Accepted" ||
                        t.Status == "In Progress"
                    ))
                .Select(t => t.AssignedTo!)
                .Distinct()
                .ToListAsync();

            // =========================================================
            // Employees busy with TRAINING tickets
            // =========================================================
            var busyTrainingEmployees = await _context.TicketAssignments
                .Where(ta =>
                    employeeIds.Contains(ta.EmployeeId) &&
                    (
                        ta.Status == "Assigned" ||
                        ta.Status == "Accepted" ||
                        ta.Status == "In Progress"
                    ))
                .Select(ta => ta.EmployeeId)
                .Distinct()
                .ToListAsync();

            // =========================================================
            // Combine busy employees from both Normal & Training
            // =========================================================
            var busyEmployees = busyNormalEmployees
                .Union(busyTrainingEmployees)
                .ToList();

            // =========================================================
            // Return only FREE employees
            // =========================================================
            return employees
                .Where(e => !busyEmployees.Contains(e.Employee_Id))
                .ToList();
        }
        private async Task AssignTrainingTicketAsync(
    Ticket ticket,
    List<Employee> employees)
        {
            if (employees == null || !employees.Any())
                return;

            bool assignedAny = false;

            foreach (var employee in employees)
            {
                var alreadyAssigned = await _context.TicketAssignments
                    .AnyAsync(x =>
                        x.TicketId == ticket.Id &&
                        x.EmployeeId == employee.Employee_Id);

                if (alreadyAssigned)
                    continue;

                _context.TicketAssignments.Add(new TicketAssignment
                {
                    TicketId = ticket.Id,
                    EmployeeId = employee.Employee_Id,
                    Status = "Assigned",
                    AssignedDate = DateTime.UtcNow,
                    IsAccepted = false
                });

                assignedAny = true;

                // Save History
                await SaveHistoryAsync(
                    ticket.Id,
                    "Assigned",
                    ticket.Status,
                    "Assigned",
                    employee.Employee_Id,
                    "Training ticket automatically assigned");

                // Notification
                await _notificationService.CreateNotification(
                    new UserNotificationDto
                    {
                        Employee_Id = employee.Employee_Id,
                        Title = "New Training Ticket Assigned",
                        Message = $"Training Ticket '{ticket.Title}' has been assigned to you."
                    });

                // Email
                if (!string.IsNullOrWhiteSpace(employee.Email))
                {
                    string subject = $"Training Ticket Assigned - {ticket.TicketNumber}";

                    string body = $@"
            <html>
            <body style='font-family:Segoe UI'>
                <h3>New Training Ticket Assigned</h3>

                <p>Hello <b>{employee.Name}</b>,</p>

                <p>A new Training ticket has been assigned to you.</p>

                <table border='1' cellpadding='8' cellspacing='0'>
                    <tr>
                        <td><b>Ticket Number</b></td>
                        <td>{ticket.TicketNumber}</td>
                    </tr>

                    <tr>
                        <td><b>Title</b></td>
                        <td>{ticket.Title}</td>
                    </tr>

                    <tr>
                        <td><b>Project</b></td>
                        <td>{ticket.ProjectId}</td>
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
                        <td><b>Start Date</b></td>
                        <td>{ticket.StartDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
                    </tr>

                    <tr>
                        <td><b>Due Date</b></td>
                        <td>{ticket.DueDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
                    </tr>

                    <tr>
                        <td><b>Description</b></td>
                        <td>{ticket.Description}</td>
                    </tr>
                </table>

                <br/>

                <p>Please login to EMS and accept the ticket.</p>

                <br/>

                <p>Regards,<br/>EMS Team</p>

            </body>
            </html>";

                    await _emailService.SendEmailAsync(
                        employee.Email,
                        subject,
                        body);
                }
            }

            if (assignedAny)
            {
                ticket.Status = "Assigned";
                ticket.AssignmentType = "Training Assignment";
                ticket.AssignedDate = DateTime.UtcNow;
                ticket.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
            }
        }
        // =========================================================
        // ASSIGN SINGLE TICKET
        // =========================================================
        // =========================================================
        // ASSIGN SINGLE TICKET
        // =========================================================
        public async Task AssignTicketAsync(int ticketId)
        {
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t =>
                    t.Id == ticketId &&
                    t.IsActive);

            if (ticket == null)
                return;

            // =====================================================
            // Accept Pending & Pending Assignment
            // =====================================================
            var isPending =
                string.Equals(
                    ticket.Status?.Trim(),
                    "Pending",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    ticket.Status?.Trim(),
                    "Pending Assignment",
                    StringComparison.OrdinalIgnoreCase);

            if (!isPending)
                return;

            // =====================================================
            // Already assigned (Normal Tickets)
            // =====================================================
            if (!ticket.Technology.Equals("Training", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(ticket.AssignedTo))
            {
                return;
            }

            // =====================================================
            // Get Eligible Employees
            // =====================================================
            var employees = await GetEligibleEmployeesAsync(ticket);

            if (!employees.Any())
                return;

            // =====================================================
            // Only Present Employees
            // =====================================================
            employees = await GetPresentEmployeesAsync(employees);

            if (!employees.Any())
                return;

            // =====================================================
            // Only Employees Without Active Tickets
            // =====================================================
            employees = await FilterFreeEmployeesAsync(employees);

            if (!employees.Any())
                return;

            // =====================================================
            // TRAINING TICKET
            // Assign to all eligible employees
            // =====================================================
            if (ticket.Technology.Equals(
                "Training",
                StringComparison.OrdinalIgnoreCase))
            {
                await AssignTrainingTicketAsync(
                    ticket,
                    employees);

                return;
            }

            Employee? selectedEmployee = null;
            string assignmentType = string.Empty;

            // =====================================================
            // PRIORITY 1 : MODULE CONTINUITY
            // =====================================================
            selectedEmployee =
                await FindModuleContinuationEmployeeAsync(
                    ticket,
                    employees);

            if (selectedEmployee != null)
            {
                assignmentType = "Module Continuity";
            }
            else
            {
                // =================================================
                // PRIORITY 2 : ROUND ROBIN
                // =================================================
                selectedEmployee =
                    await FindRoundRobinEmployeeAsync(
                        ticket,
                        employees);

                if (selectedEmployee != null)
                {
                    assignmentType = "Round Robin";
                }
            }

            if (selectedEmployee == null)
                return;

            // =====================================================
            // SAVE ASSIGNMENT
            // =====================================================
            await SaveAssignmentAsync(
                ticket,
                selectedEmployee,
                assignmentType);
        }

        // =========================================================
        // AUTO ASSIGN ALL PENDING TICKETS
        // =========================================================
        public async Task AutoAssignPendingTickets()
        {
            var tickets = await GetPendingTicketsAsync();

            foreach (var ticket in tickets)
            {
                await AssignTicketAsync(ticket.Id);
            }
        }

        // =========================================================
        // MODULE CONTINUITY
        //
        // Only searches inside FREE employees.
        // Therefore previous employee is selected only when free.
        // =========================================================
        public async Task<Employee?>
            FindModuleContinuationEmployeeAsync(
                Ticket ticket,
                List<Employee> employees)
        {
            if (employees == null || !employees.Any())
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(ticket.Module))
            {
                return null;
            }

            var employeeIds = employees
                .Select(e => e.Employee_Id)
                .ToList();

            var previousTicket = await _context.Tickets
                .Where(t =>
                    t.ProjectId == ticket.ProjectId &&
                    t.Module == ticket.Module &&
                    t.Status == "Completed" &&
                    t.AssignedTo != null &&
                    employeeIds.Contains(t.AssignedTo))
                .OrderByDescending(t => t.CompletedDate)
                .ThenByDescending(t => t.Id)
                .FirstOrDefaultAsync();

            if (previousTicket == null)
            {
                return null;
            }

            return employees.FirstOrDefault(e =>
                e.Employee_Id == previousTicket.AssignedTo);
        }

        // =========================================================
        // ROUND ROBIN
        // =========================================================
        public async Task<Employee?>
            FindRoundRobinEmployeeAsync(
                Ticket ticket,
                List<Employee> employees)
        {
            if (employees == null || !employees.Any())
            {
                return null;
            }

            var orderedEmployees = employees
                .OrderBy(e => e.Employee_Id)
                .ToList();

            var employeeIds = orderedEmployees
                .Select(e => e.Employee_Id)
                .ToList();

            var lastAssignedEmployeeId =
                await _context.Tickets
                    .Where(t =>
                        t.ProjectId == ticket.ProjectId &&
                        t.Technology == ticket.Technology &&
                        t.AssignedTo != null &&
                        employeeIds.Contains(t.AssignedTo))
                    .OrderByDescending(t => t.AssignedAt)
                    .ThenByDescending(t => t.Id)
                    .Select(t => t.AssignedTo)
                    .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(
                lastAssignedEmployeeId))
            {
                return orderedEmployees.First();
            }

            var index = orderedEmployees.FindIndex(e =>
                e.Employee_Id == lastAssignedEmployeeId);

            if (index == -1)
            {
                return orderedEmployees.First();
            }

            index++;

            if (index >= orderedEmployees.Count)
            {
                index = 0;
            }

            return orderedEmployees[index];
        }

        // =========================================================
        // SAVE ASSIGNMENT
        // =========================================================
        public async Task SaveAssignmentAsync(
     Ticket ticket,
     Employee employee,
     string assignmentType)
        {
            var latestTicket = await _context.Tickets
                .FirstOrDefaultAsync(t =>
                    t.Id == ticket.Id &&
                    t.IsActive);

            if (latestTicket == null)
                return;

            // =========================================================
            // Accept both Pending & Pending Assignment
            // =========================================================
            var isPending =
                string.Equals(
                    latestTicket.Status?.Trim(),
                    "Pending",
                    StringComparison.OrdinalIgnoreCase)
                ||
                string.Equals(
                    latestTicket.Status?.Trim(),
                    "Pending Assignment",
                    StringComparison.OrdinalIgnoreCase);

            if (!isPending)
                return;

            // =========================================================
            // Ticket already assigned
            // =========================================================
            if (!string.IsNullOrWhiteSpace(latestTicket.AssignedTo))
                return;

            // =========================================================
            // ONE EMPLOYEE = ONE ACTIVE TICKET
            // Check Normal Tickets
            // =========================================================
            var hasNormalTicket = await _context.Tickets
                .AnyAsync(t =>
                    t.IsActive &&
                    t.Id != latestTicket.Id &&
                    t.AssignedTo == employee.Employee_Id &&
                    (
                        t.Status == "Assigned" ||
                        t.Status == "Accepted" ||
                        t.Status == "In Progress"
                    ));

            // =========================================================
            // Check Training Tickets
            // =========================================================
            var hasTrainingTicket = await _context.TicketAssignments
                .AnyAsync(ta =>
                    ta.EmployeeId == employee.Employee_Id &&
                    (
                        ta.Status == "Assigned" ||
                        ta.Status == "Accepted" ||
                        ta.Status == "In Progress"
                    ));

            if (hasNormalTicket || hasTrainingTicket)
                return;

            var oldStatus = latestTicket.Status;

            // =========================================================
            // Assign Ticket
            // =========================================================
            latestTicket.AssignedTo = employee.Employee_Id;
            latestTicket.Status = "Assigned";
            latestTicket.AssignmentType = assignmentType;
            latestTicket.AssignedDate = DateTime.UtcNow;
            latestTicket.AssignedAt = DateTime.UtcNow;
            latestTicket.UpdatedAt = DateTime.UtcNow;

            // AssignedBy should remain the Manager who created the ticket

            await _context.SaveChangesAsync();

            // =========================================================
            // Save History
            // =========================================================
            await SaveHistoryAsync(
                latestTicket.Id,
                "Assigned",
                oldStatus,
                "Assigned",
                employee.Employee_Id,
                $"Automatically assigned using {assignmentType}");

            // =========================================================
            // Notification
            // =========================================================
            await _notificationService.CreateNotification(
                new UserNotificationDto
                {
                    Employee_Id = employee.Employee_Id,
                    Title = "New Ticket Assigned",
                    Message = $"Ticket '{latestTicket.Title}' has been assigned to you."
                });

            // =========================================================
            // Email
            // =========================================================
            if (!string.IsNullOrWhiteSpace(employee.Email))
            {
                string subject = $"New Ticket Assigned - {latestTicket.TicketNumber}";

                string body = $@"
        <html>
        <body style='font-family:Segoe UI'>
            <h3>New Ticket Assigned</h3>

            <p>Hello <b>{employee.Name}</b>,</p>

            <p>A new ticket has been assigned to you.</p>

            <table border='1' cellpadding='8' cellspacing='0'>
                <tr>
                    <td><b>Ticket Number</b></td>
                    <td>{latestTicket.TicketNumber}</td>
                </tr>

                <tr>
                    <td><b>Title</b></td>
                    <td>{latestTicket.Title}</td>
                </tr>

                <tr>
                    <td><b>Project</b></td>
                    <td>{latestTicket.ProjectId}</td>
                </tr>

                <tr>
                    <td><b>Technology</b></td>
                    <td>{latestTicket.Technology}</td>
                </tr>

                <tr>
                    <td><b>Module</b></td>
                    <td>{latestTicket.Module}</td>
                </tr>

                <tr>
                    <td><b>Priority</b></td>
                    <td>{latestTicket.Priority}</td>
                </tr>

                <tr>
                    <td><b>Start Date</b></td>
                    <td>{latestTicket.StartDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
                </tr>

                <tr>
                    <td><b>Due Date</b></td>
                    <td>{latestTicket.DueDate?.ToString("dd-MMM-yyyy") ?? "-"}</td>
                </tr>

                <tr>
                    <td><b>Description</b></td>
                    <td>{latestTicket.Description}</td>
                </tr>
            </table>

            <br/>

            <p>Please login to EMS and accept the ticket.</p>

            <br/>

            <p>Regards,<br/>EMS Team</p>

        </body>
        </html>";

                await _emailService.SendEmailAsync(
                    employee.Email,
                    subject,
                    body);
            }
        }

            // =========================================================
            // SEND EMAIL
            // =========================================================

           
          // =========================================================
        // HISTORY
        // =========================================================
        public async Task SaveHistoryAsync(
            int ticketId,
            string action,
            string? oldStatus,
            string? newStatus,
            string employeeId,
            string remarks)
        {
            var history = new TicketHistory
            {
                TicketId = ticketId,
                EmployeeId = employeeId,
                Action = action,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Remarks = remarks,
                CreatedBy = "System",
                CreatedAt = DateTime.UtcNow
            };

            _context.TicketHistory.Add(history);

            await _context.SaveChangesAsync();
        }

        // =========================================================
        // ASSIGN NEXT TICKET AFTER COMPLETION
        // =========================================================
        public async Task AssignNextTicketForEmployeeAsync(string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e =>
                    e.Employee_Id == employeeId &&
                    e.Status == "Active");

            if (employee == null)
                return;

            // -------------------------------------------------
            // Employee must not have any active Normal Ticket
            // -------------------------------------------------
            var hasNormalTicket = await _context.Tickets
                .AnyAsync(t =>
                    t.IsActive &&
                    t.AssignedTo == employeeId &&
                    (
                        t.Status == "Assigned" ||
                        t.Status == "Accepted" ||
                        t.Status == "In Progress"
                    ));

            // -------------------------------------------------
            // Employee must not have any active Training Ticket
            // -------------------------------------------------
            var hasTrainingTicket = await _context.TicketAssignments
                .AnyAsync(ta =>
                    ta.EmployeeId == employeeId &&
                    (
                        ta.Status == "Assigned" ||
                        ta.Status == "Accepted" ||
                        ta.Status == "In Progress"
                    ));

            if (hasNormalTicket || hasTrainingTicket)
                return;

            // -------------------------------------------------
            // Employee must be present today
            // -------------------------------------------------
            var today = DateTime.Today;

            var isPresent = await _context.Attendance
                .AnyAsync(a =>
                    a.Employee_Id == employeeId &&
                    a.Attendance_Date.Date == today &&
                    a.Check_In != null &&
                    (
                        a.Status == "Present" ||
                        a.Status == "Late"
                    ));

            if (!isPresent)
                return;

            // -------------------------------------------------
            // Employee Project/Technology Mapping
            // -------------------------------------------------
            var teamMappings = await _context.ProjectTeamMembers
                .Where(x => x.EmployeeId == employeeId)
                .Select(x => new
                {
                    x.ProjectId,
                    x.Technology
                })
                .Distinct()
                .ToListAsync();

            if (!teamMappings.Any())
                return;

            Ticket? selectedTicket = null;

            // =====================================================
            // PRIORITY 1 : MODULE CONTINUITY (Normal Tickets Only)
            // =====================================================

            var previousCompletedTicket = await _context.Tickets
                .Where(t =>
                    t.AssignedTo == employeeId &&
                    t.Status == "Completed" &&
                    t.Module != null)
                .OrderByDescending(t => t.CompletedDate)
                .ThenByDescending(t => t.Id)
                .FirstOrDefaultAsync();

            if (previousCompletedTicket != null)
            {
                selectedTicket = await _context.Tickets
                    .Where(t =>
                        t.IsActive &&
                        t.AssignedTo == null &&
                        (
                            t.Status == "Pending" ||
                            t.Status == "Pending Assignment"
                        ) &&
                        !t.Technology.Equals("Training") &&
                        t.ProjectId == previousCompletedTicket.ProjectId &&
                        t.Technology == previousCompletedTicket.Technology &&
                        t.Module == previousCompletedTicket.Module)
                    .OrderBy(t => t.CreatedAt)
                    .ThenBy(t => t.Id)
                    .FirstOrDefaultAsync();
            }

            // =====================================================
            // PRIORITY 2 : NEXT ELIGIBLE TICKET
            // =====================================================

            if (selectedTicket == null)
            {
                var pendingTickets = await _context.Tickets
                    .Where(t =>
                        t.IsActive &&
                        (
                            t.Status == "Pending" ||
                            t.Status == "Pending Assignment"
                        ))
                    .OrderBy(t => t.CreatedAt)
                    .ThenBy(t => t.Id)
                    .ToListAsync();

                foreach (var ticket in pendingTickets)
                {
                    bool eligible = teamMappings.Any(mapping =>
                        mapping.ProjectId == ticket.ProjectId &&
                        mapping.Technology.Equals(
                            ticket.Technology,
                            StringComparison.OrdinalIgnoreCase));

                    if (!eligible)
                        continue;

                    if (!ticket.Technology.Equals("Training", StringComparison.OrdinalIgnoreCase))
                    {
                        // Normal Ticket
                        if (string.IsNullOrWhiteSpace(ticket.AssignedTo))
                        {
                            selectedTicket = ticket;
                            break;
                        }
                    }
                    else
                    {
                        // Training Ticket
                        bool alreadyAssigned = await _context.TicketAssignments
                            .AnyAsync(x =>
                                x.TicketId == ticket.Id &&
                                x.EmployeeId == employeeId);

                        if (!alreadyAssigned)
                        {
                            selectedTicket = ticket;
                            break;
                        }
                    }
                }
            }

            if (selectedTicket == null)
                return;

            // =====================================================
            // ASSIGN NEXT TICKET
            // =====================================================

            if (selectedTicket.Technology.Equals("Training", StringComparison.OrdinalIgnoreCase))
            {
                await AssignTrainingTicketAsync(
                    selectedTicket,
                    new List<Employee> { employee });
            }
            else
            {
                await SaveAssignmentAsync(
                    selectedTicket,
                    employee,
                    "Auto Assignment After Completion");
            }
        }
    }
}