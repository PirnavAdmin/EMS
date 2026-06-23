namespace EmployeeManagementSystem.Services
{
    using EmployeeManagementSystem.Data;
    using EmployeeManagementSystem.DTOs;
    using EmployeeManagementSystem.Interfaces;
    using EmployeeManagementSystem.Models;
    using Microsoft.EntityFrameworkCore;

    public class RoleService : IRoleService
    {
        private readonly AppDbContext _context;

        public RoleService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Role> CreateRole(CreateRoleDto dto)
        {
            var exists = await _context.Roles
                .AnyAsync(r => r.Name == dto.Name);

            if (exists)
                throw new Exception("Role already exists");

            var role = new Role
            {
                Name = dto.Name,
                IsActive = dto.IsActive
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            return role;
        }

        public async Task<List<RoleResponseDto>> GetRoles()
        {
            return await _context.Roles
                .Select(r => new RoleResponseDto
                {
                    Id = r.RoleId,
                    Name = r.Name,
                    IsActive = r.IsActive,

                    UsersCount = _context.Employees.Count(e => e.RoleId == r.RoleId)
                })
                .ToListAsync();
        }

        public async Task<Role?> UpdateRole(int roleId, CreateRoleDto dto)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleId == roleId);

            if (role == null)
                return null;

            role.Name = dto.Name;
            role.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return role;
        }

        public async Task<bool> DeleteRole(int roleId)
        {
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleId == roleId);

            if (role == null)
                return false;

            var isUsed = await _context.Users
                .AnyAsync(u => u.RoleId == roleId);

            if (isUsed)
                throw new Exception("Role is assigned to users. Cannot delete.");

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            return true;
        }
    }
}