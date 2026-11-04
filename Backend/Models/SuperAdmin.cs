namespace EmployeeManagementSystem.Models
{
    public class SuperAdmin
    {
        public int SuperAdminId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public string? Mobile { get; set; }

        public bool IsActive { get; set; }

        public DateTime? LastLogin { get; set; }

        public DateTime CreatedDate { get; set; }

        // SuperAdmin role
        public string Role { get; set; } = "SuperAdmin";
    }
}