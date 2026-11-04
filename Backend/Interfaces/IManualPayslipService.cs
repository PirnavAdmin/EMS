using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IManualPayslipService
    {
        Task<string> GenerateManualPaySlip(ManualPaySlipDto dto);
    }
}
