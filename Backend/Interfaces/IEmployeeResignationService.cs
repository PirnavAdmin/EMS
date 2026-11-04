using EmployeeManagementSystem.DTOs;

using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IEmployeeResignationService

    {

        Task<bool> ApplyResignation(
     CreateResignationDto dto,
     string employeeId);

        Task<bool> UpdateResignation(

            UpdateResignationDto dto);

        Task<bool> DeleteResignation(

            int resignationId);

        Task<List<ResignationResponseDto>> GetAll();

        Task<ResignationResponseDto?> GetById(

            int resignationId);

        Task<List<ResignationResponseDto>> GetByEmployee(

            string employeeId);

        Task<List<ResignationResponseDto>> GetPendingApprovals();

        Task<bool> ExitApproval(

            ExitApprovalDto dto,

            ClaimsPrincipal user);

    }

}
