using EmployeeManagementSystem.Models;
using System.ComponentModel.DataAnnotations.Schema;

[Table("userpermission")]
public class UserPermission
{
    public int Id { get; set; }

    public string EmployeeId { get; set; } = string.Empty;

    public Employee Employee { get; set; }

    public int ModuleId { get; set; }

    public Module Module { get; set; }

    public bool CanAccess { get; set; }
    public bool CanView { get; set; }
    public bool CanAdd { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }

    public DateTime CreatedAt { get; set; }
}