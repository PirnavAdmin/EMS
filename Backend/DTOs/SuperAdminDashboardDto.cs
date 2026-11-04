namespace EmployeeManagementSystem.DTOs
{
    public class SuperAdminDashboardDto
    {
        // CLIENT COUNTS
        public int TotalClients { get; set; }
        public int ActiveClients { get; set; }
        public int InactiveClients { get; set; }

        // SUBSCRIPTION COUNTS
        public int ActiveSubscriptions { get; set; }
        public int ExpiredSubscriptions { get; set; }
        public int ExpiringSoon { get; set; }
        public int NoSubscription { get; set; }

        // USER / EMPLOYEE CAPACITY
        public int TotalAllowedUsers { get; set; }
        public int TotalCurrentUsers { get; set; }
        public int TotalRemainingUsers { get; set; }

        // CLIENT DETAILS
        public List<ClientDashboardItemDto> Clients { get; set; } = new();
    }


    public class ClientDashboardItemDto
    {
        // Internally this is Admin.Id
        public int ClientId { get; set; }

        public string Email { get; set; } = string.Empty;

        public bool IsActive { get; set; }

        // SUBSCRIPTION
        public int MaxUsers { get; set; }

        public int CurrentUsers { get; set; }

        public int RemainingUsers { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string SubscriptionStatus { get; set; } = string.Empty;

        public int DaysRemaining { get; set; }
    }
}