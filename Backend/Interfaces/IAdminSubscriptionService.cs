using EmployeeManagementSystem.DTOs;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IAdminSubscriptionService
    {
        Task<object> CreateSubscription(AdminSubscriptionDto dto);

        Task<object> GetSubscription(int adminId);

        Task<object> GetAllSubscriptions();

        Task<object> UpdateSubscription(
            int adminId,
            AdminSubscriptionDto dto);

        Task<object> GetUsage(int adminId);
    }
}