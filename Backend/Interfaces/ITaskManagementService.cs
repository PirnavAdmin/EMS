using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;

namespace EmployeeManagementSystem.Services
{
    public interface ITaskManagementService
    {
        Task<string> CreateTask(TaskManagementDto dto);

        Task<List<TaskManagement>> GetAllTasks();

        Task<List<TaskManagement>> GetTasksByEmployee(string employeeId);

        Task<object?> UpdateTask(int id, TaskManagementDto dto);

        Task<string> UpdateStatus(int id, string status);

        Task<string> DeleteTask(int id);
        Task CheckTaskDeadlines();
        Task<byte[]> ExportTasksExcel();
    }
}