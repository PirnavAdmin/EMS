using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class ModuleSearchService
    {
        private readonly AppDbContext _context;

        public ModuleSearchService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ModuleSearchResponseDto> SearchModule(string keyword)
        {
            // 🔍 Find module
            var module = await _context.Modules
    .FirstOrDefaultAsync(m =>
        EF.Functions.Like(m.ModuleName, $"%{keyword}%"));

            if (module == null)
                return null;

            // 🔥 Mapping (NO switch-case)
            var moduleMap = new Dictionary<string, Func<Task<object>>>
            {
                ["payroll"] = async () => await _context.PaySlips
                    .OrderByDescending(p => p.Generated_On)
                    .Take(10)
                    .ToListAsync(),

                ["employees"] = async () => await _context.Employees
                    .Take(10)
                    .ToListAsync(),

                ["departments"] = async () => await _context.Departments
                    .Take(10)
                    .ToListAsync(),

                ["tasks"] = async () => await _context.TaskManagement
                    .Take(10)
                    .ToListAsync(),

                ["leaves"] = async () => await _context.EmployeeLeaves
                    .Take(10)
                    .ToListAsync(),
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