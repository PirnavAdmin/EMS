using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("organizations")]

    public class Organization

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public string OrganizationName { get; set; } = string.Empty;

        public string? OrganizationCode { get; set; }

        public string? ContactPerson { get; set; }

        [EmailAddress]

        public string? Email { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? State { get; set; }

        public string? Country { get; set; }

        public string Status { get; set; } = "Active"; // "Active", "Inactive", "Suspended"

        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedDate { get; set; }

    }

}

