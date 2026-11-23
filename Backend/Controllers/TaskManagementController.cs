using DocumentFormat.OpenXml.InkML;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - TaskManagementController with complete Audit Logging
    [ApiController]
    [Route("api/[controller]")]
    public class TaskManagementController : ControllerBase
    {
        private readonly ITaskManagementService _taskService;
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public TaskManagementController(
            ITaskManagementService taskService,
            AppDbContext context,
            IAuditLogService auditLogService) // varsha
        {
            _taskService = taskService;
            _context = context;
            _auditLogService = auditLogService; // varsha
        }

        // CREATE TASK
        [HttpPost]
        public async Task<IActionResult> Create(TaskManagementDto dto)
        {
            var result = await _taskService.CreateTask(dto);

            // varsha - Audit task creation
            await _auditLogService.LogCreateAsync(
                module: "TaskManagement",
                entityName: "Task",
                entityId: dto.TaskTitle,
                description: $"Created task '{dto.TaskTitle}' assigned to {dto.AssignedTo}",
                newValues: dto,
                user: User);

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
        // varsha - Capture existing task state before update
        var existingTask = await _context.TaskManagement.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        var oldValues = existingTask != null ? new
        {
            existingTask.TaskTitle,
            existingTask.AssignedTo,
            existingTask.Project,
            existingTask.Description,
            existingTask.Priority,
            DueDate = existingTask.DueDate?.ToString("yyyy-MM-dd"),
            existingTask.Status
        } : null;

        var task = await _taskService.UpdateTask(id, dto);

        if (task == null)
            return NotFound("Task not found");

        // varsha - Audit task update with delta
        await _auditLogService.LogUpdateAsync(
            module: "TaskManagement",
            entityName: "Task",
            entityId: id.ToString(),
            description: $"Updated task '{dto.TaskTitle}' (ID: {id})",
            oldValues: oldValues,
            newValues: dto,
            user: User);

        return Ok(new { message = "Task updated successfully", data = task });
    }

    // UPDATE STATUS
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] string status)
    {
        // varsha - Capture existing task status before status update
        var existingTask = await _context.TaskManagement.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        var oldValues = existingTask != null ? new { existingTask.Status } : null;

        var result = await _taskService.UpdateStatus(id, status);

        if (result == "Task not found")
            return NotFound(result);

        // varsha - Audit task status change with delta
        var newValues = new { Status = status };
        await _auditLogService.LogUpdateAsync(
            module: "TaskManagement",
            entityName: "Task",
            entityId: id.ToString(),
            description: $"Updated task {id} status from '{existingTask?.Status}' to '{status}'",
            oldValues: oldValues,
            newValues: newValues,
            user: User);

        return Ok(new { message = result });
    }

    // DELETE
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        // varsha - Capture existing task state before deletion
        var existingTask = await _context.TaskManagement.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        var oldValues = existingTask != null ? new
        {
            existingTask.Id,
            existingTask.TaskTitle,
            existingTask.AssignedTo,
            existingTask.Status
        } : null;

        var result = await _taskService.DeleteTask(id);

        if (result == "Task not found")
            return NotFound(result);

        // varsha - Audit task deletion
        await _auditLogService.LogDeleteAsync(
            module: "TaskManagement",
            entityName: "Task",
            entityId: id.ToString(),
            description: $"Deleted task '{existingTask?.TaskTitle}' (ID: {id})",
            oldValues: oldValues,
            user: User);

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

        if (employee == null || employee.Status != "Active") // varsha: block inactive employee from task retrieval
            return NotFound("Employee not found or is inactive"); // varsha

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
}