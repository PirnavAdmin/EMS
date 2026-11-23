using EmployeeManagementSystem.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ITicketAssignmentEngine
    {
        Task AutoAssignPendingTickets(int? organizationId = null);
        Task AssignTicketAsync(int ticketId);
        Task<List<Ticket>> GetPendingTicketsAsync(int? organizationId = null);
        Task<List<Employee>> GetEligibleEmployeesAsync(Ticket ticket);
        Task<List<Employee>> GetPresentEmployeesAsync(List<Employee> employees);
        Task<List<Employee>> FilterFreeEmployeesAsync(List<Employee> employees, int? organizationId = null);
        Task<Employee?> FindModuleContinuationEmployeeAsync(Ticket ticket, List<Employee> employees);
        Task<Employee?> FindRoundRobinEmployeeAsync(Ticket ticket, List<Employee> employees);
        Task SaveAssignmentAsync(Ticket ticket, Employee employee, string assignmentType);
        Task SaveHistoryAsync(int ticketId, string action, string? oldStatus, string? newStatus, string employeeId, string remarks);
        Task AssignNextTicketForEmployeeAsync(string employeeId);
    }
}
