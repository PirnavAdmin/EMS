using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class TicketOverdueService : ITicketOverdueService
    {
        private readonly AppDbContext _context;

        public TicketOverdueService(AppDbContext context)
        {
            _context = context;
        }

        public async Task CheckOverdueTicketsAsync()
        {
            var now = DateTime.UtcNow;

            var overdueTickets = await _context.Tickets
                .Where(t =>
                    t.IsActive &&
                    t.Status == "In Progress" &&
                    t.Deadline.HasValue &&
                    t.Deadline.Value.AddHours(1) <= now) // 1-hour grace period
                .ToListAsync();

            if (!overdueTickets.Any())
                return;

            foreach (var ticket in overdueTickets)
            {
                ticket.Status = "Overdue";
                ticket.SLAStatus = "Breached";

                if (ticket.OverdueDate == null)
                {
                    ticket.OverdueDate = now;
                }

                // Delay calculated after grace period
                ticket.DelayMinutes = (int)(now - ticket.Deadline.Value.AddHours(1)).TotalMinutes;

                ticket.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
        }
    }
}