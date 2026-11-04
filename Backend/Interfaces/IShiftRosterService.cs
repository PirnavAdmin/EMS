using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftRosterService
    {
        Task<IEnumerable<ShiftRosterResponseDto>> GetAllAsync();

        Task<ShiftRosterResponseDto?> GetByIdAsync(int id);

        Task<IEnumerable<ShiftRosterResponseDto>> GetEmployeeRosterAsync(string employeeId);

        Task<bool> CreateAsync(CreateShiftRosterDto dto);

        Task<bool> UpdateAsync(int id, UpdateShiftRosterDto dto);

        Task<bool> DeleteAsync(int id);

        Task<bool> BulkAssignAsync(BulkShiftRosterDto dto);
    }
}