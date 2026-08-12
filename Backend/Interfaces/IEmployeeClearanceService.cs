using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IEmployeeClearanceService
    {
        Task<bool> Create(CreateClearanceDto dto);

        Task<bool> UpdateDepartment(UpdateDepartmentClearanceDto dto);

        Task<ClearanceResponseDto?> GetByResignation(int resignationId);

        Task<List<ClearanceResponseDto>> GetPending();

        Task<List<ClearanceResponseDto>> GetCompleted();
    }
}