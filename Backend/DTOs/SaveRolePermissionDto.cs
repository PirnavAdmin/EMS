namespace EmployeeManagementSystem.DTOs
{
    public class SaveRolePermissionDto
    {
        public string RoleName { get; set; } = string.Empty;  // ✅ FIX

        public List<ModulePermissionDto> Modules { get; set; } = new();
    }

    public class ModulePermissionDto
    {
        public int ModuleId { get; set; }
        public bool CanAccess { get; set; }
    }
}