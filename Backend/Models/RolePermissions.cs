using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("rolepermissions")]
    public class RolePermission
    {
        public int Id { get; set; }

        public int RoleId { get; set; }

        public int ModuleId { get; set; }

        public bool CanView { get; set; }

        public bool CanAdd { get; set; }

        public bool CanEdit { get; set; }

        public bool CanDelete { get; set; }
        public bool CanAccess { get; set; }
       

        public Role Role { get; set; }

        public Module Module { get; set; }
    }
}

