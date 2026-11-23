using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class ModuleSearchService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ModuleSearchService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<ModuleSearchResponseDto> SearchModule(string keyword)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            // 🔍 Find module
            var module = await _context.Modules
                .FirstOrDefaultAsync(m =>
                    EF.Functions.Like(m.ModuleName, $"%{keyword}%"));

            if (module == null)
                return null;

            // 🔥 Mapping (NO switch-case)
            var moduleMap = new Dictionary<string, Func<Task<object>>>
            {
                ["payroll"] = async () =>
                {
                    var q = _context.PaySlips.AsQueryable();
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        q = q.Where(p => p.OrganizationId == orgId.Value);
                    }
                    return await q
                        .OrderByDescending(p => p.Generated_On)
                        .Take(10)
                        .ToListAsync();
                },

                ["employees"] = async () =>
                {
                    var q = _context.Employees.AsQueryable();
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        q = q.Where(e => e.OrganizationId == orgId.Value);
                    }
                    return await q
                        .Take(10)
                        .ToListAsync();
                },

                ["departments"] = async () =>
                {
                    var q = _context.Departments.AsQueryable();
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        q = q.Where(d => d.OrganizationId == orgId.Value);
                    }
                    return await q
                        .Take(10)
                        .ToListAsync();
                },

                ["tasks"] = async () =>
                {
                    var q = _context.TaskManagement.AsQueryable();
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        q = q.Where(t => t.OrganizationId == orgId.Value);
                    }
                    return await q
                        .Take(10)
                        .ToListAsync();
                },

                ["leaves"] = async () =>
                {
                    var q = _context.EmployeeLeaves.AsQueryable();
                    if (orgId.HasValue && orgId.Value > 0)
                    {
                        q = q.Where(l => l.OrganizationId == orgId.Value);
                    }
                    return await q
                        .Take(10)
                        .ToListAsync();
                },
            };

            var key = module.ModuleName.ToLower();

            object data = null;

            if (moduleMap.ContainsKey(key))
            {
                data = await moduleMap[key]();
            }

            return new ModuleSearchResponseDto
            {
                ModuleId = module.ModuleId,
                ModuleName = module.ModuleName,
                Data = data,
                Route = "/" + key   // frontend navigation
            };
        }
    }
}