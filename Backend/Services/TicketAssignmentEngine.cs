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
                    t.IsActive &&
                    t.AssignedTo == null &&
                    (
                        t.Status == "Pending" ||
                        t.Status == "Pending Assignment"
                    ))
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

            var busyEmployeeIds = await _context.Tickets
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

            return employees
                .Where(e =>
                    !busyEmployeeIds.Contains(e.Employee_Id))
                .ToList();
        }

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
            {
                return;
            }

            // Accept Pending and Pending Assignment
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
            {
                return;
            }

            // Ticket already assigned
            if (!string.IsNullOrWhiteSpace(ticket.AssignedTo))
            {
                return;
            }

            // Project + Technology employees
            var employees =
                await GetEligibleEmployeesAsync(ticket);

            if (!employees.Any())
            {
                return;
            }

            // Present employees
            employees =
                await GetPresentEmployeesAsync(employees);

            if (!employees.Any())
            {
                return;
            }

            // IMPORTANT:
            // Remove employees who already have one active ticket
            employees =
                await FilterFreeEmployeesAsync(employees);

            if (!employees.Any())
            {
                return;
            }

            Employee? selectedEmployee = null;
            string assignmentType = string.Empty;

            // =====================================================
            // PRIORITY 1: MODULE CONTINUITY
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
                // PRIORITY 2: ROUND ROBIN
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
            {
                return;
            }

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
            {
                return;
            }

            // Accept both Pending and Pending Assignment
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
            {
                return;
            }

            // Ticket already assigned
            if (!string.IsNullOrWhiteSpace(
                latestTicket.AssignedTo))
            {
                return;
            }

            // =========================================================
            // ONE EMPLOYEE = ONE ACTIVE TICKET
            // =========================================================

            var employeeIsBusy = await _context.Tickets
                .AnyAsync(t =>
                    t.IsActive &&
                    t.Id != latestTicket.Id &&
                    t.AssignedTo == employee.Employee_Id &&
                    (
                        t.Status == "Assigned" ||
                        t.Status == "Accepted" ||
                        t.Status == "In Progress"
                    ));

            if (employeeIsBusy)
            {
                return;
            }

            var oldStatus = latestTicket.Status;

            // =========================================================
            // AUTO ASSIGN TICKET
            // =========================================================

            latestTicket.AssignedTo =
                employee.Employee_Id;

            latestTicket.Status =
                "Assigned";

            latestTicket.AssignmentType =
                assignmentType;

            latestTicket.AssignedDate =
                DateTime.UtcNow;

            latestTicket.AssignedAt =
                DateTime.UtcNow;

            latestTicket.UpdatedAt =
                DateTime.UtcNow;

            // IMPORTANT:
            // DO NOT UPDATE AssignedBy HERE.
            //
            // AssignedBy already contains manager Employee_Id
            // from SP_CreateTicket.
            //
            // Example:
            // AssignedBy = P300
            //
            // FK -> employees.Employee_Id
            // Employee Name -> Madhu

            await _context.SaveChangesAsync();

            // =========================================================
            // SAVE ASSIGNMENT HISTORY
            // =========================================================

            await SaveHistoryAsync(
                latestTicket.Id,
                "Assigned",
                oldStatus,
                "Assigned",
                employee.Employee_Id,
                $"Automatically assigned using {assignmentType}");

            // =========================================================
            // CREATE NOTIFICATION
            // =========================================================

            await _notificationService.CreateNotification(
                new UserNotificationDto
                {
                    Employee_Id = employee.Employee_Id,
                    Title = "New Ticket Assigned",
                    Message =
                        $"Ticket '{latestTicket.Title}' " +
                        $"has been assigned to you."
                });

            // =========================================================
            // SEND EMAIL
            // =========================================================

           
        }  // =========================================================
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
        public async Task AssignNextTicketForEmployeeAsync(
            string employeeId)
        {
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e =>
                    e.Employee_Id == employeeId &&
                    e.Status == "Active");

            if (employee == null)
            {
                return;
            }

            // Employee must not have another active ticket
            var hasActiveTicket = await _context.Tickets
                .AnyAsync(t =>
                    t.IsActive &&
                    t.AssignedTo == employeeId &&
                    (
                        t.Status == "Assigned" ||
                        t.Status == "Accepted" ||
                        t.Status == "In Progress"
                    ));

            if (hasActiveTicket)
            {
                return;
            }

            // Employee must be present today
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
            {
                return;
            }

            // Get all Project + Technology mappings
            var teamMappings =
                await _context.ProjectTeamMembers
                    .Where(x =>
                        x.EmployeeId == employeeId)
                    .Select(x => new
                    {
                        x.ProjectId,
                        x.Technology
                    })
                    .Distinct()
                    .ToListAsync();

            if (!teamMappings.Any())
            {
                return;
            }

            Ticket? selectedTicket = null;

            // =====================================================
            // PRIORITY 1: MODULE CONTINUITY
            // =====================================================
            var previousCompletedTicket =
                await _context.Tickets
                    .Where(t =>
                        t.AssignedTo == employeeId &&
                        t.Status == "Completed" &&
                        t.Module != null)
                    .OrderByDescending(t => t.CompletedDate)
                    .ThenByDescending(t => t.Id)
                    .FirstOrDefaultAsync();

            if (previousCompletedTicket != null)
            {
                selectedTicket =
                    await _context.Tickets
                        .Where(t =>
                            t.IsActive &&
                            t.AssignedTo == null &&
                            (
                                t.Status == "Pending" ||
                                t.Status ==
                                    "Pending Assignment"
                            ) &&
                            t.ProjectId ==
                                previousCompletedTicket.ProjectId &&
                            t.Technology ==
                                previousCompletedTicket.Technology &&
                            t.Module ==
                                previousCompletedTicket.Module)
                        .OrderBy(t => t.CreatedAt)
                        .ThenBy(t => t.Id)
                        .FirstOrDefaultAsync();
            }

            // =====================================================
            // PRIORITY 2:
            // NEXT ELIGIBLE PROJECT + TECHNOLOGY TICKET
            // =====================================================
            if (selectedTicket == null)
            {
                var pendingTickets =
                    await _context.Tickets
                        .Where(t =>
                            t.IsActive &&
                            t.AssignedTo == null &&
                            (
                                t.Status == "Pending" ||
                                t.Status ==
                                    "Pending Assignment"
                            ))
                        .OrderBy(t => t.CreatedAt)
                        .ThenBy(t => t.Id)
                        .ToListAsync();

                selectedTicket = pendingTickets
                    .FirstOrDefault(ticket =>
                        teamMappings.Any(mapping =>
                            mapping.ProjectId ==
                                ticket.ProjectId &&
                            string.Equals(
                                mapping.Technology,
                                ticket.Technology,
                                StringComparison.OrdinalIgnoreCase)));
            }

            if (selectedTicket == null)
            {
                return;
            }

            await SaveAssignmentAsync(
                selectedTicket,
                employee,
                "Auto Assignment After Completion");
        }
    }
}