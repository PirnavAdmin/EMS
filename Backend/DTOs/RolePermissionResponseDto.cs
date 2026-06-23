namespace EmployeeManagementSystem.DTOs
{
    public class RolePermissionResponseDto
    {
        public int ModuleId { get; set; }
        public string ModuleName { get; set; }
        public string Type { get; set; }
        public bool CanAccess { get; set; }
    }
}
