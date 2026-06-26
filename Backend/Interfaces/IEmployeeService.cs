using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Services
{
    public interface IEmployeeService
    {
        Task<object> AddEmployee(EmployeeDto dto);

        Task<List<Employee>> GetAllEmployees();

        Task<Employee?> UpdateEmployee(string EmployeeId, EmployeeDto dto);

        Task<string> DeleteEmployee(string employeeId);
        Task<byte[]> ExportFullEmployeeMaster();

        Task<Employee?> GetEmployeeByEmployeeId(string employeeId);
        Task SaveChanges();
        Task<byte[]> ExportEmployeeProfilePdf(string employeeId);
    }
}