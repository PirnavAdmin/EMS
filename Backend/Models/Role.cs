/*
namespace EmployeeManagementSystem.Models
{
    public class Role
    {
        
        public int RoleId { get; set; }
        public string Name { get; set; }
       
        public ICollection<RolePermission> RolePermissions { get; set; }
    }
}

*/


using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EmployeeManagementSystem.Models
{
    [Table("roles")]
    public class Role
    {
        [Key]
        public int RoleId { get; set; }   

        public string Name { get; set; }
        public bool IsActive { get; set; } = true;

        public ICollection<RolePermission>? RolePermissions { get; set; }

        public ICollection<Register>? Users { get; set; }
    }
}