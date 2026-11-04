namespace EmployeeManagementSystem.Interfaces
{
    public interface IForm16Service
    {
        Task<string> GenerateForm16Async(string employeeId, string financialYear);
    }
}