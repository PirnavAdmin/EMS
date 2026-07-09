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
        public async Task<List<Ticket>> GetPendingTicketsAsync()
        {
            return await _context.Tickets
                .Where(t =>
                    t.Status == "Pending" &&
                    t.IsActive)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.CreatedAt)
                .ToListAsync();
        }
        public async Task<List<Employee>> GetEligibleEmployeesAsync(Ticket ticket)
        {
            var employeeIds = await _context.ProjectTeamMembers
                .Where(x =>
                    x.ProjectId == ticket.ProjectId &&
                    x.Technology == ticket.Technology)
                .Select(x => x.EmployeeId)
                .ToListAsync();

            return await _context.Employees
                .Where(x =>
                    employeeIds.Contains(x.Employee_Id) &&
                    x.Status == "Active")
                .ToListAsync();
        }

        public async Task AssignTicketAsync(int ticketId)
        {
            // Get Ticket
            var ticket = await _context.Tickets
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null)
                return;

            // Already Assigned
            if (!string.IsNullOrWhiteSpace(ticket.AssignedTo))
                return;

            // Get eligible employees based on Project + Technology
            var employees = await GetEligibleEmployeesAsync(ticket);

            if (!employees.Any())
                return;

            // Filter employees who are present today
            employees = await GetPresentEmployeesAsync(employees);


            if (!employees.Any())
                return;

            // Remove employees who already reached maximum workload
            employees = await FilterEmployeesByCapacityAsync(employees);

            if (!employees.Any())
                return;

            Employee? selectedEmployee = null;
            string assignmentType = string.Empty;

            //----------------------------------------------------
            // Priority 1 : Module Continuation
            //----------------------------------------------------
            selectedEmployee = await FindModuleContinuationEmployeeAsync(
                ticket,
                employees);

            if (selectedEmployee != null)
            {
                assignmentType = "Module Continuity";
            }
            else
            {
                //----------------------------------------------------
                // Priority 2 : Least Workload
                //----------------------------------------------------
                var leastLoadedEmployees =
                    await FindLeastWorkloadEmployeesAsync(employees);

                if (leastLoadedEmployees.Count == 1)
                {
                    selectedEmployee = leastLoadedEmployees.First();
                    assignmentType = "Least Workload";
                }
                else if (leastLoadedEmployees.Count > 1)
                {
                    //------------------------------------------------
                    // Priority 3 : Round Robin
                    //------------------------------------------------
                    selectedEmployee = await FindRoundRobinEmployeeAsync(
                        ticket,
                        leastLoadedEmployees);

                    if (selectedEmployee != null)
                    {
                        assignmentType = "Round Robin";
                    }
                }
            }

            if (selectedEmployee == null)
                return;

            //----------------------------------------------------
            // Save Assignment
            //----------------------------------------------------
            await SaveAssignmentAsync(
                ticket,
                selectedEmployee,
                assignmentType);
        }
        public async Task AutoAssignPendingTickets()
        {
            var tickets = await GetPendingTicketsAsync();

            foreach (var ticket in tickets)
            {
                await AssignTicketAsync(ticket.Id);
            }
        }

        public async Task<List<Employee>> GetPresentEmployeesAsync(List<Employee> employees)
        {
            if (!employees.Any())
                return new List<Employee>();

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
                .ToListAsync();

            return employees
                .Where(e => presentEmployeeIds.Contains(e.Employee_Id))
                .ToList();
        }
        public async Task<Employee?> FindModuleContinuationEmployeeAsync(
      Ticket ticket,
      List<Employee> employees)
        {
            if (!employees.Any())
                return null;

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
                .FirstOrDefaultAsync();

            if (previousTicket == null)
                return null;

            return employees.FirstOrDefault(e =>
                e.Employee_Id == previousTicket.AssignedTo);
        }
        public async Task<List<Employee>> FindLeastWorkloadEmployeesAsync(
     List<Employee> employees)
        {
            var workloads = new Dictionary<Employee, int>();

            foreach (var employee in employees)
            {
                var workload = await _context.Tickets.CountAsync(t =>
                    t.AssignedTo == employee.Employee_Id &&
                    (t.Status == "Assigned" || t.Status == "In Progress"));

                workloads.Add(employee, workload);
            }

            var minimum = workloads.Min(x => x.Value);

            return workloads
                .Where(x => x.Value == minimum)
                .Select(x => x.Key)
                .ToList();
        }
        public async Task<Employee?> FindRoundRobinEmployeeAsync(
      Ticket ticket,
      List<Employee> employees)
        {
            if (!employees.Any())
                return null;

            var orderedEmployees = employees
                .OrderBy(e => e.Employee_Id)
                .ToList();

            var lastAssignedEmployeeId = await _context.Tickets
                .Where(t =>
                    t.ProjectId == ticket.ProjectId &&
                    t.AssignedTo != null)
                .OrderByDescending(t => t.UpdatedAt)
                .Select(t => t.AssignedTo)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastAssignedEmployeeId))
                return orderedEmployees.First();

            var index = orderedEmployees.FindIndex(e =>
                e.Employee_Id == lastAssignedEmployeeId);

            if (index == -1)
                return orderedEmployees.First();

            index++;

            if (index >= orderedEmployees.Count)
                index = 0;

            return orderedEmployees[index];
        }
        public async Task SaveAssignmentAsync(
            Ticket ticket,
            Employee employee,
            string assignmentType)
        {
            ticket.AssignedTo = employee.Employee_Id;

            ticket.Status = "Assigned";

            ticket.AssignedAt = DateTime.UtcNow;

            ticket.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await SaveHistoryAsync(
                ticket.Id,
                "Assigned",
                "Pending Assignment",
                "Assigned",
                employee.Employee_Id,
                $"Automatically assigned using {assignmentType}");

            await _notificationService.CreateNotification(new UserNotificationDto
            {
                Employee_Id = employee.Employee_Id,
                Title = "New Ticket Assigned",
                Message = $"Ticket '{ticket.Title}' has been assigned to you."
            });

            await _emailService.SendEmailAsync(
     employee.Email,
     "New Ticket Assigned",
     $@"
Hello {employee.Name},

A new ticket has been assigned to you.

Ticket Number : {ticket.TicketNumber}
Title         : {ticket.Title}
Priority      : {ticket.Priority}

Please log in to EMS and start working on it.

Regards,
EMS Team");
        }
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
                CreatedAt = DateTime.Now
            };

            _context.TicketHistory.Add(history);

            await _context.SaveChangesAsync();
        }

        public async Task<List<Employee>> FilterEmployeesByCapacityAsync(
    List<Employee> employees,
    int maxActiveTickets = 10)
        {
            var availableEmployees = new List<Employee>();

            foreach (var employee in employees)
            {
                var activeTickets = await _context.Tickets.CountAsync(t =>
                    t.AssignedTo == employee.Employee_Id &&
                    (t.Status == "Assigned" ||
                     t.Status == "In Progress"));

                if (activeTickets < maxActiveTickets)
                {
                    availableEmployees.Add(employee);
                }
            }

            return availableEmployees;
        }

        public async Task AssignNextTicketForEmployeeAsync(string employeeId)
        {
            // Get employee
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                return;

            // Find the employee's project and technology
            var teamMember = await _context.ProjectTeamMembers
                .Where(x => x.EmployeeId == employeeId)
                .FirstOrDefaultAsync();

            if (teamMember == null)
                return;

            // Find the next pending ticket for that project and technology
            var ticket = await _context.Tickets
                .Where(t =>
                    t.ProjectId == teamMember.ProjectId &&
                    t.Technology == teamMember.Technology &&
                    t.Status == "Pending Assignment" &&
                    t.AssignedTo == null &&
                    t.IsActive)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (ticket == null)
                return;

            // Assign the ticket directly
            await SaveAssignmentAsync(
                ticket,
                employee,
                "Auto Assignment After Completion");
        }
        public async Task AssignNextTicketForEmployeeAsync(
    string employeeId,
    int projectId,
    string technology)
        {
            // Find employee
            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

            if (employee == null)
                return;

            // Find next pending ticket
            var ticket = await _context.Tickets
                .Where(t =>
                    t.ProjectId == projectId &&
                    t.Technology == technology &&
                    t.Status == "Pending Assignment" &&
                    t.AssignedTo == null &&
                    t.IsActive)
                .OrderBy(t => t.Priority)
                .ThenBy(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (ticket == null)
                return;

            await SaveAssignmentAsync(
                ticket,
                employee,
                "Auto Assignment After Completion");
        }

    }
}