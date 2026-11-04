using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IShiftPlannerService
    {
        Task<IEnumerable<ShiftPlannerDto>> GetAllAsync();

        Task<ShiftPlannerDto?> GetByIdAsync(int plannerId);

        Task<bool> CreateAsync(CreateShiftPlannerDto dto);

        Task<bool> UpdateAsync(int plannerId, UpdateShiftPlannerDto dto);

        Task<bool> DeleteAsync(int plannerId);

        Task<bool> PublishAsync(int plannerId);

        Task<bool> CopyWeekAsync(DateTime fromWeekStart, DateTime toWeekStart);

        Task<bool> CopyMonthAsync(int sourceMonth, int sourceYear, int targetMonth, int targetYear);
    }
}