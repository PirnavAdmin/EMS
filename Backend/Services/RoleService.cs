namespace EmployeeManagementSystem.Services
{
    using EmployeeManagementSystem.Data;
    using EmployeeManagementSystem.DTOs;
    using EmployeeManagementSystem.Helpers;
    using EmployeeManagementSystem.Interfaces;
    using EmployeeManagementSystem.Models;
    using Microsoft.AspNetCore.Http;
    using Microsoft.EntityFrameworkCore;

    public class RoleService : IRoleService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RoleService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<Role> CreateRole(CreateRoleDto dto)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var exists = await _context.Roles
                .AnyAsync(r => r.Name.ToLower() == dto.Name.ToLower() &&
                               (r.OrganizationId == orgId || r.OrganizationId == null));

            if (exists)
                throw new Exception("Role already exists");

            var role = new Role
            {
                OrganizationId = orgId,
                Name = dto.Name,
                IsActive = dto.IsActive
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            return role;
        }

        public async Task<List<RoleResponseDto>> GetRoles()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.Roles.AsNoTracking();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(r => r.OrganizationId == null || r.OrganizationId == orgId.Value);
            }

            return await query
                .Select(r => new RoleResponseDto
                {
                    Id = r.RoleId,
                    Name = r.Name,
                    IsActive = r.IsActive,

                    UsersCount = _context.Employees.Count(e => e.RoleId == r.RoleId && (!orgId.HasValue || e.OrganizationId == orgId.Value))
                })
                .ToListAsync();
        }

        public async Task<Role?> UpdateRole(int roleId, CreateRoleDto dto)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleId == roleId);
           
            if (role == null)
                return null;

            if (orgId.HasValue && role.OrganizationId.HasValue && role.OrganizationId.Value != orgId.Value)
                throw new Exception("You do not have permission to modify this role.");

            role.Name = dto.Name;
            role.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();

            return role;
        }

        public async Task<bool> DeleteRole(int roleId)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleId == roleId);

            if (role == null)
                return false;

            if (role.OrganizationId == null)
                throw new Exception("System default roles cannot be deleted.");

            if (orgId.HasValue && role.OrganizationId.Value != orgId.Value)
                throw new Exception("You do not have permission to delete this role.");

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