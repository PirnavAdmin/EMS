using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IAdminNotificationService
    {
        Task<IActionResult> GetNotifications(ClaimsPrincipal user);

        Task<IActionResult> GetUnreadCount(ClaimsPrincipal user);

        Task<IActionResult> MarkAsRead(ClaimsPrincipal user, int id);

        Task<IActionResult> MarkAllAsRead(ClaimsPrincipal user);

        Task CreateNotification(string title, string message);
    }
}