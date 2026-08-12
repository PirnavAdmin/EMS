using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models
{
    public class AdminSubscription
    {
        [Key]
        public int SubscriptionId { get; set; }

        public int AdminId { get; set; }

        public int MaxUsers { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}