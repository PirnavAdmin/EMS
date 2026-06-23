namespace EmployeeManagementSystem.Models
{
    public class RolePermission
    {
        public int Id { get; set; }

        public int RoleId { get; set; }
        public Role Role { get; set; }

        public int ModuleId { get; set; }
        public Module Module { get; set; }

        public bool CanAccess { get; set; }
    }
}

