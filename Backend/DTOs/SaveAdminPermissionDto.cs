namespace EmployeeManagementSystem.DTOs
{
    public class SaveAdminPermissionDto
    {
        public int AdminId { get; set; }

        public List<AdminModulePermissionDto> Modules { get; set; } = new();
    }

    public class AdminModulePermissionDto
    {
        public int ModuleId { get; set; }

        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }

        public bool CanAccess { get; set; }
    }
}
