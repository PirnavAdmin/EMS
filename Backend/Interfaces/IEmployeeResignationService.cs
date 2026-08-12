using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IEmployeeResignationService
    {
        Task<bool> ApplyResignation(CreateResignationDto dto);

        Task<bool> UpdateResignation(UpdateResignationDto dto);

        Task<bool> DeleteResignation(int resignationId);

        Task<List<ResignationResponseDto>> GetAll();

        Task<ResignationResponseDto?> GetById(int resignationId);

        Task<List<ResignationResponseDto>> GetByEmployee(string employeeId);

        Task<List<ResignationResponseDto>> GetPendingManagerApprovals();

        Task<List<ResignationResponseDto>> GetPendingHRApprovals();

        Task<bool> ManagerApproval(ManagerApprovalDto dto);

        Task<bool> HRApproval(HRApprovalDto dto);
    }
}