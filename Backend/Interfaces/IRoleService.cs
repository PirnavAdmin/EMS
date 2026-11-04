using EmployeeManagementSystem.DTOs;   // ✅ IMPORTANT
using EmployeeManagementSystem.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Interfaces
{
    public interface IRoleService
    {
        Task<Role> CreateRole(CreateRoleDto dto);

        Task<List<RoleResponseDto>> GetRoles();
        Task<Role?> UpdateRole(int roleId, CreateRoleDto dto);

        Task<bool> DeleteRole(int roleId);
    }
}