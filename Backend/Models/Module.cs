namespace EmployeeManagementSystem.Models
{
    public class Module
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public string? Type { get; set; }

        public ICollection<RolePermission> RolePermissions { get; set; }
        public ICollection<UserPermission> UserPermissions { get; set; }
       = new List<UserPermission>();
    }
}
