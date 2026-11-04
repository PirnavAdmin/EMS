using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Services
{
    public interface IAppraisalSalaryService
    {
        Task<AppraisalSalaryDto?> GetRevisedSalaryAsync(
            string employeeId,
            int appraisalId);

        Task<AppraisalSalaryDto?> SaveRevisedSalaryAsync(
            AppraisalSalaryDto dto);

        Task<string> GenerateAppraisalLetterAsync(
            int appraisalId);

        Task SendAppraisalLetterEmailAsync(
            int appraisalId);
        Task<string> GetAppraisalLetterPathAsync(int appraisalId);
    }
}