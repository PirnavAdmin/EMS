using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public interface IEmployeeService
    {
       

        Task<List<Employee>> GetAllEmployees();

        Task<object> AddEmployee(
     ClaimsPrincipal user,
     EmployeeDto dto);

        Task<Employee?> UpdateEmployee(
            ClaimsPrincipal user,
            string employeeId,
            EmployeeDto dto);

        Task<string> DeleteEmployee(
            ClaimsPrincipal user,
            string employeeId);

        Task<object> BulkUploadEmployees(
            ClaimsPrincipal user,
            IFormFile file);
        Task<byte[]> ExportFullEmployeeMaster();
        Task<byte[]> DownloadEmployeeUploadTemplate();
        Task<Employee?> GetEmployeeByEmployeeId(string employeeId);
        Task SaveChanges();
        Task<byte[]> ExportEmployeeProfilePdf(string employeeId);
      
        Task<List<UpcomingBirthdayDto>> GetUpcomingBirthdays();

        Task<List<OnboardingCandidateDropdownDto>> GetOnboardingCandidatesAsync();

        Task<OnboardingDetailsDto?> GetOnboardingDetailsAsync(string onboardingId);


    }
}