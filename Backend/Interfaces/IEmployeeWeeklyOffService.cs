using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

public interface IEmployeeWeeklyOffService
{
    Task<IEnumerable<EmployeeWeeklyOff>> GetAllAsync();
    Task<EmployeeWeeklyOff?> GetByIdAsync(int id);
    Task<bool> CreateAsync(CreateEmployeeWeeklyOffDto dto);
    Task<bool> UpdateAsync(int id, UpdateEmployeeWeeklyOffDto dto);
    Task<bool> DeleteAsync(int id);
}