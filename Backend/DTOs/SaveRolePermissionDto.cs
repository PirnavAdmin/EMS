namespace EmployeeManagementSystem.DTOs
{
    public class SaveRolePermissionDto
    {
        public string RoleName { get; set; } = string.Empty;

        public List<ModulePermissionDto> Modules { get; set; } = new();
    }

    public class ModulePermissionDto
    {
        public int ModuleId { get; set; }

        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }

        public bool CanAccess { get; set; }
        // Optional
        
    }
}