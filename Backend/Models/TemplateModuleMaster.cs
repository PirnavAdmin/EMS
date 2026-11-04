using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models

{

    public class TemplateModuleMaster

    {

        [Key]

        public int ModuleId { get; set; }

        [Required]

        public string ModuleCode { get; set; } = string.Empty;

        [Required]

        public string ModuleName { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsMergeTemplate { get; set; } = true;

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

    }

}
