using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IPaySlipService

    {

        Task<string> GeneratePaySlip(string employeeId, int year, string month, decimal OtherDeductions);

        Task<List<string>> GenerateAllPaySlips(int year, string month);

        Task<List<PaySlip>> GetRecentPayslips();

        Task<byte[]> DownloadSalaryRegister(string month, int year);

    }

}
