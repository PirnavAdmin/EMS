using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IEmployeeSalaryStructureService
    {
        Task<EmployeeSalaryStructure> CreateAsync(
            EmployeeSalaryStructureDto dto);

        Task<EmployeeSalaryStructure?> GetByEmployeeIdAsync(
            string employeeId);

        Task<List<EmployeeSalaryStructure>> GetAllAsync();

        Task<EmployeeSalaryStructure?> UpdateAsync(
            string employeeId,
            EmployeeSalaryStructureDto dto);

        Task<bool> DeleteAsync(string employeeId);
    }
}