using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmployeeManagementSystem.Services
{
    public class ShiftRotationService : IShiftRotationService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ShiftRotationService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private async Task<(int? OrgId, List<string> EmployeeIds)> GetCurrentOrgEmployeeContextAsync()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null)
            {
                var allActive = await _context.Employees.AsNoTracking().Where(e => e.Status == "Active").Select(e => e.Employee_Id).ToListAsync();
                return (null, allActive);
            }

            var orgId = CurrentUserHelper.GetOrganizationId(user);
            int? adminId = null;

            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int aid) && aid > 0)
                adminId = aid;

            if (!orgId.HasValue || orgId.Value <= 0)
            {
                if (adminId.HasValue)
                {
                    var admin = await _context.Admins.AsNoTracking().FirstOrDefaultAsync(a => a.Id == adminId.Value);
                    if (admin?.OrganizationId != null && admin.OrganizationId > 0)
                        orgId = admin.OrganizationId.Value;
                }
            }

            if (!orgId.HasValue || orgId.Value <= 0)
            {
                var empId = CurrentUserHelper.GetEmployeeId(user);
                if (!string.IsNullOrWhiteSpace(empId))
                {
                    var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == empId);
                    if (emp?.OrganizationId != null && emp.OrganizationId > 0)
                        orgId = emp.OrganizationId.Value;
                }
            }

            if (orgId.HasValue && orgId.Value > 0)
            {
                var orgAdminIds = await _context.Admins
                    .AsNoTracking()
                    .Where(a => a.OrganizationId == orgId.Value)
                    .Select(a => a.Id)
                    .ToListAsync();

                var empIds = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.OrganizationId == orgId.Value || (e.AdminId.HasValue && orgAdminIds.Contains(e.AdminId.Value)))
                    .Select(e => e.Employee_Id)
                    .ToListAsync();

                return (orgId.Value, empIds);
            }

            var fallbackEmpIds = await _context.Employees.AsNoTracking().Where(e => e.Status == "Active").Select(e => e.Employee_Id).ToListAsync();
            return (null, fallbackEmpIds);
        }

        public async Task<IEnumerable<ShiftRotation>> GetAllAsync()
        {
            var (orgId, _) = await GetCurrentOrgEmployeeContextAsync();
            var query = _context.ShiftRotations.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return await query
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
        }

        public async Task<ShiftRotation?> GetByIdAsync(int id)
        {
            var (orgId, _) = await GetCurrentOrgEmployeeContextAsync();
            var query = _context.ShiftRotations.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return await query.FirstOrDefaultAsync(x => x.RotationId == id);
        }

        public async Task<bool> CreateAsync(CreateShiftRotationDto dto)
        {
            if (dto.EmployeeIds == null || dto.EmployeeIds.Count == 0)
                return false;

            if (dto.EffectiveFrom == default)
                return false;

            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();
            if (!orgId.HasValue || orgId.Value <= 0)
                return false;
            int currentOrgId = orgId.Value;

            // 1. Validate mandatory shift 1 belongs to current organization
            var shift1Exists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.Shift1Id && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));

            if (!shift1Exists)
                return false;

            // 2. Validate optional shifts
            if (dto.Shift2Id.HasValue)
            {
                var shift2Exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift2Id.Value && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));

                if (!shift2Exists || dto.Shift2Id.Value == dto.Shift1Id)
                    return false;
            }

            if (dto.Shift3Id.HasValue)
            {
                var shift3Exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift3Id.Value && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));

                if (!shift3Exists || dto.Shift3Id.Value == dto.Shift1Id || dto.Shift3Id.Value == dto.Shift2Id)
                    return false;
            }

            // 3. Validate that all Employee IDs belong to the caller's organization
            var distinctIds = dto.EmployeeIds
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

            var validEmployeeIds = await _context.Employees
                .Where(x => distinctIds.Contains(x.Employee_Id) && (tenantEmployeeIds == null || tenantEmployeeIds.Contains(x.Employee_Id)))
                .Select(x => x.Employee_Id)
                .ToListAsync();

            if (validEmployeeIds.Count != distinctIds.Count)
                return false;

            // 4. Close existing active rotation and create new rotation stamped with caller OrganizationId
            foreach (var empId in validEmployeeIds)
            {
                var existingRotations = await _context.ShiftRotations
                    .Where(x => x.Employee_Id == empId && x.IsActive && x.OrganizationId == currentOrgId)
                    .ToListAsync();

                foreach (var ex in existingRotations)
                {
                    ex.IsActive = false;
                }

                _context.ShiftRotations.Add(new ShiftRotation
                {
                    OrganizationId = currentOrgId,
                    Employee_Id = empId,
                    RotationType = dto.RotationType,
                    Shift1Id = dto.Shift1Id,
                    Shift2Id = dto.Shift2Id,
                    Shift3Id = dto.Shift3Id,
                    EffectiveFrom = dto.EffectiveFrom,
                    IsActive = true,
                    CreatedDate = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateAsync(int id, UpdateShiftRotationDto dto)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();
            if (!orgId.HasValue || orgId.Value <= 0)
                return false;
            int currentOrgId = orgId.Value;

            var rotation = await _context.ShiftRotations
                .FirstOrDefaultAsync(x => x.RotationId == id && (orgId == null || x.OrganizationId == currentOrgId));

            if (rotation == null)
                return false;

            var employeeExists = await _context.Employees
                .AnyAsync(x => x.Employee_Id == rotation.Employee_Id && (tenantEmployeeIds == null || tenantEmployeeIds.Contains(x.Employee_Id)));

            if (!employeeExists)
                return false;

            var shift1Exists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.Shift1Id && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));

            if (!shift1Exists)
                return false;

            if (dto.Shift2Id.HasValue)
            {
                var exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift2Id.Value && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));
                if (!exists) return false;
            }

            if (dto.Shift3Id.HasValue)
            {
                var exists = await _context.ShiftMasters
                    .AnyAsync(x => x.ShiftId == dto.Shift3Id.Value && x.IsActive && (orgId == null || x.OrganizationId == currentOrgId));
                if (!exists) return false;
            }

            if (dto.EffectiveFrom == default)
                return false;

            if (dto.Shift2Id.HasValue && dto.Shift2Id.Value == dto.Shift1Id)
                return false;

            if (dto.Shift3Id.HasValue && (dto.Shift3Id.Value == dto.Shift1Id || dto.Shift3Id.Value == dto.Shift2Id))
                return false;

            rotation.RotationType = dto.RotationType;
            rotation.Shift1Id = dto.Shift1Id;
            rotation.Shift2Id = dto.Shift2Id;
            rotation.Shift3Id = dto.Shift3Id;
            rotation.EffectiveFrom = dto.EffectiveFrom;
            rotation.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var (orgId, _) = await GetCurrentOrgEmployeeContextAsync();

            var rotation = await _context.ShiftRotations
                .FirstOrDefaultAsync(x => x.RotationId == id && (orgId == null || x.OrganizationId == orgId.Value));

            if (rotation == null)
                return false;

            _context.ShiftRotations.Remove(rotation);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
