namespace EmployeeManagementSystem.DTOs
{
    public class RolePermissionResponseDto
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public string Type { get; set; }
        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }
        public bool CanAccess { get; set; }
       
    }
}
