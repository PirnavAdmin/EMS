using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("Admins")]

    public class Admin

    {

        [Key]

        public int Id { get; set; }

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string Role { get; set; } = "Admin";

        public bool IsActive { get; set; } = true;

        public string? FullName { get; set; }

        public string? PhoneNumber { get; set; }

        public int? OrganizationId { get; set; }

        public string? OrganizationName { get; set; }

        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastLogin { get; set; }

    }

}

