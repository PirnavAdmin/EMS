namespace EmployeeManagementSystem.DTOs
{
    public class AdminSubscriptionDto
    {
        public int AdminId { get; set; }

        public int MaxUsers { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;
    }
}