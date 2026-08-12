using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IFullFinalSettlementService
    {
        Task<bool> GenerateSettlement(GenerateSettlementDto dto);

        Task<bool> ApproveSettlement(ApproveSettlementDto dto);

        Task<List<SettlementResponseDto>> GetAll();

        Task<SettlementResponseDto?> GetEmployeeSettlement(string employeeId);

        Task<bool> DeleteSettlement(int settlementId);
    }
}