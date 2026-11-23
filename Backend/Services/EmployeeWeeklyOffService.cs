using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class EmployeeWeeklyOffService : IEmployeeWeeklyOffService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public EmployeeWeeklyOffService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private async Task<int?> GetCurrentOrgIdAsync()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, user);
            return orgId;
        }

        public async Task<IEnumerable<EmployeeWeeklyOff>> GetAllAsync()
        {
            var orgId = await GetCurrentOrgIdAsync();
            var query = _context.EmployeeWeeklyOffs.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return await query
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
        }

        public async Task<EmployeeWeeklyOff?> GetByIdAsync(int id)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var query = _context.EmployeeWeeklyOffs.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return await query.FirstOrDefaultAsync(x => x.WeeklyOffId == id);
        }

        public async Task<bool> CreateAsync(CreateEmployeeWeeklyOffDto dto)
        {
            var orgId = await GetCurrentOrgIdAsync();

            // Employee validation
            var empQuery = _context.Employees.Where(x => x.Employee_Id == dto.Employee_Id);
            if (orgId.HasValue && orgId.Value > 0)
            {
                empQuery = empQuery.Where(x => x.OrganizationId == orgId.Value);
            }

            var employee = await empQuery.FirstOrDefaultAsync();
            if (employee == null)
                return false;

            // Date validation
            if (dto.EffectiveFrom == default)
                return false;

            if (dto.EffectiveTo.HasValue &&
                dto.EffectiveTo.Value.Date < dto.EffectiveFrom.Date)
                return false;

            // Duplicate active weekly off within tenant
            var exists = await _context.EmployeeWeeklyOffs.AnyAsync(x =>
                (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                x.Employee_Id == dto.Employee_Id &&
                x.DayName == dto.DayName &&
                x.IsActive);

            if (exists)
                return false;

            var weeklyOff = new EmployeeWeeklyOff
            {
                OrganizationId = orgId ?? employee.OrganizationId,
                Employee_Id = dto.Employee_Id,
                DayName = dto.DayName,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                IsActive = true,
                CreatedDate = DateTime.Now
            };

            _context.EmployeeWeeklyOffs.Add(weeklyOff);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateAsync(int id, UpdateEmployeeWeeklyOffDto dto)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var query = _context.EmployeeWeeklyOffs.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var weeklyOff = await query.FirstOrDefaultAsync(x => x.WeeklyOffId == id);
            if (weeklyOff == null)
                return false;

            if (dto.EffectiveFrom == default)
                return false;

            if (dto.EffectiveTo.HasValue &&
                dto.EffectiveTo.Value.Date < dto.EffectiveFrom.Date)
                return false;

            // Prevent duplicate active weekly off
            var duplicate = await _context.EmployeeWeeklyOffs.AnyAsync(x =>
                (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                x.WeeklyOffId != id &&
                x.Employee_Id == weeklyOff.Employee_Id &&
                x.DayName == dto.DayName &&
                x.IsActive);

            if (duplicate)
                return false;

            weeklyOff.DayName = dto.DayName;
            weeklyOff.EffectiveFrom = dto.EffectiveFrom;
            weeklyOff.EffectiveTo = dto.EffectiveTo;
            weeklyOff.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var orgId = await GetCurrentOrgIdAsync();
            var query = _context.EmployeeWeeklyOffs.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var weeklyOff = await query.FirstOrDefaultAsync(x => x.WeeklyOffId == id);
            if (weeklyOff == null)
                return false;

            _context.EmployeeWeeklyOffs.Remove(weeklyOff);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
