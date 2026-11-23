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
    public class ShiftRosterService : IShiftRosterService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ShiftRosterService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
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


        public async Task<bool> CreateAsync(CreateShiftRosterDto dto)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();

            if (tenantEmployeeIds != null && !tenantEmployeeIds.Contains(dto.Employee_Id))
                return false;

            var employeeExists = await _context.Employees
                .AnyAsync(x => x.Employee_Id == dto.Employee_Id);

            if (!employeeExists)
                return false;

            var shiftExists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (!shiftExists)
                return false;


            if (dto.RosterDate == default)

                return false;

            // Prevent duplicate employee + date

            var exists = await _context.ShiftRosters.AnyAsync(x =>

                x.Employee_Id == dto.Employee_Id &&

                x.RosterDate.Date == dto.RosterDate.Date);

            if (exists)

                return false;

            var roster = new ShiftRoster

            {

                Employee_Id = dto.Employee_Id,

                ShiftId = dto.ShiftId,

                RosterDate = dto.RosterDate.Date,

                Remarks = dto.Remarks,

                IsPublished = dto.IsPublished,

                CreatedBy = "Admin",

                CreatedDate = DateTime.Now

            };

            _context.ShiftRosters.Add(roster);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> DeleteAsync(int id)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();

            var roster = await _context.ShiftRosters.FindAsync(id);
            if (roster == null || (tenantEmployeeIds != null && !tenantEmployeeIds.Contains(roster.Employee_Id)))
                return false;

            _context.ShiftRosters.Remove(roster);
            await _context.SaveChangesAsync();
            return true;
        }


        public async Task<IEnumerable<ShiftRosterResponseDto>> GetAllAsync()
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();

            var query = _context.ShiftRosters.AsQueryable();

            if (tenantEmployeeIds != null && tenantEmployeeIds.Any())
            {
                query = query.Where(x => tenantEmployeeIds.Contains(x.Employee_Id));
            }

            return await query
                .OrderBy(x => x.RosterDate)
                .Select(x => new ShiftRosterResponseDto
                {
                    RosterId = x.RosterId,
                    Employee_Id = x.Employee_Id,
                    ShiftId = x.ShiftId,
                    RosterDate = x.RosterDate,
                    Remarks = x.Remarks,
                    IsPublished = x.IsPublished
                })
                .ToListAsync();
        }


        public async Task<ShiftRosterResponseDto?> GetByIdAsync(int id)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();

            var query = _context.ShiftRosters.Where(x => x.RosterId == id);
            if (tenantEmployeeIds != null && tenantEmployeeIds.Any())
            {
                query = query.Where(x => tenantEmployeeIds.Contains(x.Employee_Id));
            }

            return await query
                .Select(x => new ShiftRosterResponseDto
                {
                    RosterId = x.RosterId,
                    Employee_Id = x.Employee_Id,
                    ShiftId = x.ShiftId,
                    RosterDate = x.RosterDate,
                    Remarks = x.Remarks,
                    IsPublished = x.IsPublished
                })
                .FirstOrDefaultAsync();
        }


        public async Task<IEnumerable<ShiftRosterResponseDto>> GetEmployeeRosterAsync(string employeeId)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();
            if (tenantEmployeeIds != null && !tenantEmployeeIds.Contains(employeeId))
                return Enumerable.Empty<ShiftRosterResponseDto>();

            return await _context.ShiftRosters
                .Where(x => x.Employee_Id == employeeId)
                .OrderBy(x => x.RosterDate)
                .Select(x => new ShiftRosterResponseDto
                {
                    RosterId = x.RosterId,
                    Employee_Id = x.Employee_Id,
                    ShiftId = x.ShiftId,
                    RosterDate = x.RosterDate,
                    Remarks = x.Remarks,
                    IsPublished = x.IsPublished
                })
                .ToListAsync();
        }


        public async Task<bool> UpdateAsync(int id, UpdateShiftRosterDto dto)
        {
            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();

            var roster = await _context.ShiftRosters.FindAsync(id);
            if (roster == null || (tenantEmployeeIds != null && !tenantEmployeeIds.Contains(roster.Employee_Id)))
                return false;

            var shiftExists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (!shiftExists)
                return false;


            if (dto.RosterDate == default)

                return false;

            // Prevent duplicate employee + date

            var duplicate = await _context.ShiftRosters.AnyAsync(x =>

                x.RosterId != id &&

                x.Employee_Id == roster.Employee_Id &&

                x.RosterDate.Date == dto.RosterDate.Date);

            if (duplicate)

                return false;

            roster.ShiftId = dto.ShiftId;

            roster.RosterDate = dto.RosterDate.Date;

            roster.Remarks = dto.Remarks;

            roster.IsPublished = dto.IsPublished;

            roster.UpdatedBy = "Admin";

            roster.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> BulkAssignAsync(BulkShiftRosterDto dto)

        {

            if (dto.EmployeeIds == null || dto.EmployeeIds.Count == 0)

                return false;

            if (dto.FromDate == default ||

                dto.ToDate == default ||

                dto.ToDate.Date < dto.FromDate.Date)

                return false;

            var (orgId, tenantEmployeeIds) = await GetCurrentOrgEmployeeContextAsync();
            // Validate shift belongs to caller's organization
            var shiftExists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive && (!orgId.HasValue || x.OrganizationId == orgId.Value));
            if (!shiftExists)
                return false;
            // Validate all employees belong to caller's organization
            var employeeIds = dto.EmployeeIds
                .Where(x => !string.IsNullOrWhiteSpace(x) && (tenantEmployeeIds == null || tenantEmployeeIds.Contains(x)))
                .Distinct()
                .ToList();
            var validEmployeeIds = await _context.Employees
                .Where(x => employeeIds.Contains(x.Employee_Id) && (tenantEmployeeIds == null || tenantEmployeeIds.Contains(x.Employee_Id)))
                .Select(x => x.Employee_Id)
                .ToListAsync();


            if (validEmployeeIds.Count != employeeIds.Count)

                return false;

            for (var date = dto.FromDate.Date;

                 date <= dto.ToDate.Date;

                 date = date.AddDays(1))

            {

                foreach (var emp in employeeIds)

                {

                    var exists = await _context.ShiftRosters.AnyAsync(x =>

                        x.Employee_Id == emp &&

                        x.RosterDate.Date == date);

                    if (exists)

                        continue;

                    _context.ShiftRosters.Add(new ShiftRoster

                    {

                        Employee_Id = emp,

                        ShiftId = dto.ShiftId,

                        RosterDate = date,

                        Remarks = dto.Remarks,

                        IsPublished = true,

                        CreatedBy = "Admin",

                        CreatedDate = DateTime.Now

                    });

                }

            }

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
