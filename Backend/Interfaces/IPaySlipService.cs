using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IPaySlipService

    {

        Task<string> GeneratePaySlip(
             string employeeId,
             int year,
             string month,
             decimal OtherDeductions,
             string? DeductionLabel,
             decimal TDSPercentage = 0,
             bool sendEmail = true);
        Task<bool> DeletePaySlip(int id);
        Task<List<object>> GetEmployeePayslips(string employeeId);

        Task<List<BulkPayslipGenerationResultDto>> GenerateAllPaySlips(
    int year,
    List<string> months,
    List<string> employeeIds);

        Task<List<PaySlip>> GetRecentPayslips();

        Task<byte[]> DownloadSalaryRegister(string month, int year);
        Task<BulkPayslipEmailResultDto> SendBulkPayslipEmails(
    int year,
    string month);

    }

}
