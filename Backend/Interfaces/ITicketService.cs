using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ITicketService
    {
        Task<CreateTicketResponseDto> CreateTicket(CreateTicketDto dto, ClaimsPrincipal user);
        Task<IEnumerable<TicketResponseDto>> GetAllTickets();

        Task<TicketResponseDto?> GetTicketById(int id);

        Task<IEnumerable<TicketResponseDto>> GetMyTickets(ClaimsPrincipal user);

        Task<string> UpdateTicketStatus(int ticketId, string status, ClaimsPrincipal user);

        Task<bool> DeleteTicket(int ticketId);
        Task<string> UpdateTicket(int ticketId, UpdateTicketDto dto, ClaimsPrincipal user);
        Task<byte[]> ExportTicketsToExcel();
        Task<BulkUploadResultDto> BulkUploadTickets(IFormFile file, ClaimsPrincipal user);
        Task<bool> AcceptTicketAsync(AcceptTicketDto dto);

        Task<bool> RejectTicketAsync(RejectTicketDto dto);
        Task<bool> StartWorkAsync(StartWorkDto dto);

        Task<bool> StopWorkAsync(StopWorkDto dto);
        Task<List<TicketWorkLog>> GetWorkLogsAsync(int ticketId);
        Task<List<TicketResponseDto>> GetTicketsByEmployeeIdAsync(string employeeId);
    }
}