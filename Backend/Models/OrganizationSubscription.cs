using System;

using System.ComponentModel.DataAnnotations;

using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models

{

    [Table("organizationsubscriptions")]

    public class OrganizationSubscription

    {

        [Key]

        public int Id { get; set; }

        [Required]

        public int OrganizationId { get; set; }

        [Required]

        public int MaxUsers { get; set; }

        [Required]

        public DateTime StartDate { get; set; }

        [Required]

        public DateTime EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [StringLength(100)]

        public string? PlanName { get; set; }

        [StringLength(50)]

        public string? BillingCycle { get; set; } // "Monthly", "Yearly", "Quarterly", "Custom"

        [Column(TypeName = "decimal(18,2)")]

        public decimal? Price { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedDate { get; set; }

        [StringLength(100)]

        public string? CreatedBy { get; set; }

        [StringLength(100)]

        public string? UpdatedBy { get; set; }

    }

}

