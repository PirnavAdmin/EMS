using System.ComponentModel.DataAnnotations;

namespace EmployeeManagementSystem.Models;

public class TemplateMaster

{

    [Key]

    public int TemplateId { get; set; }

    public int Company_Id { get; set; }

    public int ModuleId { get; set; }

    public string? TemplateCode { get; set; }

    public string? TemplateName { get; set; }

    public string? FileName { get; set; }

    public string? FilePath { get; set; }

    public string? Version { get; set; }

    public bool IsActive { get; set; }

    public bool IsDefault { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public TemplateModuleMaster? Module { get; set; }

}
