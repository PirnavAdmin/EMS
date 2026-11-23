using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models.Master
{
    [Table("organization_module_permissions")]
    public class OrganizationModulePermission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string OrganizationCode { get; set; } = string.Empty;

        [Required]
        public string ModuleKey { get; set; } = string.Empty;

        public bool IsEnabled { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
