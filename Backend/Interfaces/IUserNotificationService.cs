using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Models;

using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IUserNotificationService

    {

        Task<IActionResult> GetNotificationsByEmail(string email);

        Task<List<UserNotification>> GetNotifications(string employeeId);

        Task CreateNotification(UserNotificationDto dto);

        Task<bool> MarkAsRead(int id);

        Task MarkAllAsRead(string employeeId);

    }

}
