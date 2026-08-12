using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IExitInterviewService
    {
        Task<bool> Create(CreateExitInterviewDto dto);

        Task<ExitInterviewResponseDto?> GetByResignation(int resignationId);

        Task<List<ExitInterviewResponseDto>> GetAll();

        Task<bool> Delete(int exitInterviewId);
    }
}