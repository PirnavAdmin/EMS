using DocumentFormat.OpenXml.InkML;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class TaskManagementController : ControllerBase
{
    private readonly ITaskManagementService _taskService;
    private readonly AppDbContext _context;
    public TaskManagementController(ITaskManagementService taskService, AppDbContext context)
    {
        _taskService = taskService;
        _context = context;
    }

    // CREATE TASK
    [HttpPost]
    public async Task<IActionResult> Create(TaskManagementDto dto)
    {
        var result = await _taskService.CreateTask(dto);

        return Ok(new { message = result });
    }

    // GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tasks = await _taskService.GetAllTasks();
        var today = DateTime.UtcNow.Date;

        var updatedTasks = tasks.Select(task =>
        {
            var status = task.Status;

            // ✅ Convert Pending → In Progress
            if (status == "Pending")
                status = "In Progress";

            // ✅ Convert Overdue
            if (task.DueDate.HasValue &&
                task.DueDate.Value.Date < today &&
                status != "Completed")
            {
                status = "Overdue";
            }

            return new
            {
                task.Id,
                task.TaskTitle,
                task.AssignedTo,
                task.Project,
                task.Description,
                task.Priority,
                task.DueDate,
                Status = status
            };
        }).ToList();

        return Ok(updatedTasks);
    }

    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetByEmployee(string employeeId)
    {
        var tasks = await _taskService.GetTasksByEmployee(employeeId);

        return Ok(tasks);
    }
    // UPDATE TASK
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TaskManagementDto dto)
    {
        var task = await _taskService.UpdateTask(id, dto);

        if (task == null)
            return NotFound("Task not found");

        return Ok(new { message = "Task updated successfully", data = task });
    }

    // UPDATE STATUS
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] string status)
    {
        var result = await _taskService.UpdateStatus(id, status);

        if (result == "Task not found")
            return NotFound(result);

        return Ok(new { message = result });
    }

    // DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _taskService.DeleteTask(id);

        if (result == "Task not found")
            return NotFound(result);

        return Ok(result);
    }

    // CHECK DEADLINES

    [HttpPost("check-task-deadlines")]
    public async Task<IActionResult> CheckTaskDeadlines()
    {
        await _taskService.CheckTaskDeadlines();
        return Ok("Task deadline notifications checked");
    }


    [HttpPut("user/update-status/{id}")]
    public async Task<IActionResult> UpdateStatusByUser(int id, [FromBody] string status)
    {
        var result = await _taskService.UpdateStatus(id, status);
        return Ok(result);
    }
   
    [Authorize]
    [HttpGet("my-tasks")]
    public async Task<IActionResult> GetMyTasks()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        if (string.IsNullOrEmpty(email))
            return Unauthorized("Invalid token");

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Email == email);

        if (employee == null)
            return NotFound("Employee not found");

        var today = DateTime.UtcNow.Date;

        var tasks = await _context.TaskManagement
            .Where(t => t.AssignedTo == employee.Employee_Id)
            .ToListAsync();

        var updatedTasks = tasks.Select(task =>
        {
            var status = task.Status;

            // ✅ KEEP YOUR EXISTING LOGIC
            if (status == "Pending")
                status = "In Progress";

            if (task.DueDate.HasValue &&
                task.DueDate.Value.Date < today &&
                status != "Completed")
            {
                status = "Overdue";
            }

            return new
            {
                task.Id,
                task.TaskTitle,
                task.Project,
                task.Priority,
                Status = status,
                task.DueDate,
                task.Description
            };
        }).ToList();

        // ✅ ADD COUNTS HERE (THIS FIXES YOUR ISSUE)
        var todoCount = updatedTasks.Count(t => t.Status == "To Do");
        var inProgressCount = updatedTasks.Count(t => t.Status == "In Progress");
        var completedCount = updatedTasks.Count(t => t.Status == "Completed");

        return Ok(new
        {
            tasks = updatedTasks,
            todoCount,
            inProgressCount,
            completedCount
        });
    }
    [HttpGet("export")]
    public async Task<IActionResult> ExportTasks()
    {
        var fileBytes = await _taskService.ExportTasksExcel();

        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Tasks_{DateTime.Now:yyyyMMddHHmmss}.xlsx"
        );
    }
}