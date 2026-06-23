using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Interfaces

{

    public interface IAdminNotificationService

    {

        Task<List<AdminNotificationDto>> GetNotifications();

        Task<int> GetUnreadCount();

        Task<bool> MarkAsRead(int id);

        Task MarkAllAsRead();

        Task CreateNotification(string title, string message);

    }

}
