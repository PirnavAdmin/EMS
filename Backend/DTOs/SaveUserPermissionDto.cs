namespace EmployeeManagementSystem.DTOs
{
    public class SaveUserPermissionDto
    {
        public string EmployeeId { get; set; } = string.Empty;

        public List<UserModulePermissionDto> Modules { get; set; } = new();
    }

    public class UserModulePermissionDto
    {
        public int ModuleId { get; set; }

        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }

        public bool CanAccess { get; set; }
    }
}