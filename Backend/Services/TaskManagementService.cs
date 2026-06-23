using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;

namespace EmployeeManagementSystem.Services
{
    public class TaskManagementService : ITaskManagementService
    {
        private readonly IAdminNotificationService _adminNotificationService;
        private readonly IUserNotificationService _notificationService;

        private readonly AppDbContext _context;

        public TaskManagementService(
    AppDbContext context,
    IUserNotificationService notificationService,
    IAdminNotificationService adminNotificationService)
        {
            _context = context;
            _notificationService = notificationService;
            _adminNotificationService = adminNotificationService;
        }

        // CREATE TASK
        public async Task<string> CreateTask(TaskManagementDto dto)
        {
            var task = new TaskManagement
            {
                TaskTitle = dto.TaskTitle,
                Project = dto.Project,
                Priority = dto.Priority,
                Status = "To Do",
                DueDate = dto.DueDate,
                AssignedTo = dto.AssignedTo,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            await _context.TaskManagement.AddAsync(task);

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Task '{dto.TaskTitle}' created",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await _notificationService.CreateNotification(new UserNotificationDto
            {
                Employee_Id = task.AssignedTo,
                Title = "New Task Assigned",
                Message = $"You have been assigned task: {task.TaskTitle}"
            });

            return "Task created successfully";
        }

        // GET ALL TASKS
        public async Task<List<TaskManagement>> GetAllTasks()
        {
            return await _context.TaskManagement.ToListAsync();
        }

        // GET BY ID
        public async Task<List<TaskManagement>> GetTasksByEmployee(string employeeId)
        {
            return await _context.TaskManagement
                .Where(t => t.AssignedTo == employeeId)
                .ToListAsync();
        }

        // UPDATE TASK
        public async Task<object?> UpdateTask(int id, TaskManagementDto dto)
        {
            var task = await _context.TaskManagement.FindAsync(id);

            if (task == null)
                return null;

            task.TaskTitle = dto.TaskTitle;
            task.Project = dto.Project;
            task.Priority = dto.Priority;
            task.DueDate = dto.DueDate;
            task.AssignedTo = dto.AssignedTo;
            task.Description = dto.Description;

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Task '{dto.TaskTitle}' updated",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return task;
        }


        // UPDATE STATUS
        public async Task<string> UpdateStatus(int id, string status)
        {
            var task = await _context.TaskManagement.FindAsync(id);

            if (task == null)
                return "Task not found";

            task.Status = status;

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Task '{task.TaskTitle}' status changed to {status}",
                CreatedAt = DateTime.UtcNow
            });

            // ✅ IMPORTANT (Admin notification)
            await _adminNotificationService.CreateNotification(
                "Task Updated",
                $"Task '{task.TaskTitle}' marked as {status} by {task.AssignedTo}"
            );

            await _context.SaveChangesAsync();

            return "Status updated successfully";
        }

        // DELETE TASK
        public async Task<string> DeleteTask(int id)
        {
            var task = await _context.TaskManagement.FindAsync(id);

            if (task == null)
                return "Task not found";

            _context.TaskManagement.Remove(task);

            _context.ActivityLogs.Add(new ActivityLog
            {
                Activity = $"Task '{task.TaskTitle}' deleted",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return "Task deleted successfully";
        }


        // CHECK TASK DEADLINES (ADMIN ALERT)
        public async Task CheckTaskDeadlines()
        {
            var today = DateTime.UtcNow.Date;

            var tasks = await _context.TaskManagement
                .Where(t => t.Status != "Completed")
                .ToListAsync();

            foreach (var task in tasks)
            {
                if (task.DueDate.HasValue && task.DueDate.Value.Date == today)
                {
                    await _adminNotificationService.CreateNotification(
                        "Task Due Today",
                        $"{task.TaskTitle} is due today"
                    );
                }

                if (task.DueDate.HasValue && task.DueDate.Value.Date < today)
                {
                    await _adminNotificationService.CreateNotification(
                        "Task Overdue",
                        $"{task.TaskTitle} is overdue"
                    );


                }
            }
        }
        public async Task<object> GetMyTasksAsync(string email)
        {
            if (string.IsNullOrEmpty(email))
                throw new Exception("Invalid token");

            var employee = await _context.Employees
                .FirstOrDefaultAsync(e => e.Email == email);

            if (employee == null)
                throw new Exception("Employee not found");

            var today = DateTime.UtcNow.Date;

            var tasks = await _context.TaskManagement
                .Where(t => t.AssignedTo == employee.Employee_Id)
                .ToListAsync();

            var updatedTasks = tasks.Select(task =>
            {
                var status = task.Status;

                // Existing logic
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

            var todoCount = updatedTasks.Count(t => t.Status == "To Do");
            var inProgressCount = updatedTasks.Count(t => t.Status == "In Progress");
            var completedCount = updatedTasks.Count(t => t.Status == "Completed");

            return new
            {
                tasks = updatedTasks,
                todoCount,
                inProgressCount,
                completedCount
            };
        }

            public async Task<byte[]> ExportTasksExcel()
        {
            var tasks = await _context.TaskManagement
                .AsNoTracking()
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Tasks");

            // Headers
            worksheet.Cell(1, 1).Value = "Task Title";
            worksheet.Cell(1, 2).Value = "Project";
            worksheet.Cell(1, 3).Value = "Priority";
            worksheet.Cell(1, 4).Value = "Status";
            worksheet.Cell(1, 5).Value = "Assigned To";
            worksheet.Cell(1, 6).Value = "Due Date";
            worksheet.Cell(1, 7).Value = "Description";
            worksheet.Cell(1, 8).Value = "Created At";

            var headerRange = worksheet.Range(1, 1, 1, 8);
            headerRange.Style.Font.Bold = true;

            int row = 2;

            foreach (var task in tasks)
            {
                worksheet.Cell(row, 1).Value = task.TaskTitle;
                worksheet.Cell(row, 2).Value = task.Project;
                worksheet.Cell(row, 3).Value = task.Priority;
                worksheet.Cell(row, 4).Value = task.Status;
                worksheet.Cell(row, 5).Value = task.AssignedTo;
                worksheet.Cell(row, 6).Value = task.DueDate;
                worksheet.Cell(row, 7).Value = task.Description;
                worksheet.Cell(row, 8).Value = task.CreatedAt;

                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return stream.ToArray();
        }
    }
    }


