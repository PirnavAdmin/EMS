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
    public class ShiftPlannerService : IShiftPlannerService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ShiftPlannerService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? GetCurrentOrgId()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return null;

            var orgId = CurrentUserHelper.GetOrganizationId(user);
            if (orgId.HasValue && orgId.Value > 0) return orgId.Value;

            var adminIdClaim = user.FindFirst("AdminId")?.Value;
            if (!string.IsNullOrWhiteSpace(adminIdClaim) && int.TryParse(adminIdClaim, out int aid) && aid > 0)
            {
                var admin = _context.Admins.AsNoTracking().FirstOrDefault(a => a.Id == aid);
                if (admin?.OrganizationId != null && admin.OrganizationId > 0) return admin.OrganizationId.Value;
            }

            var empId = CurrentUserHelper.GetEmployeeId(user);
            if (!string.IsNullOrWhiteSpace(empId))
            {
                var emp = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Employee_Id == empId);
                if (emp?.OrganizationId != null && emp.OrganizationId > 0) return emp.OrganizationId.Value;
            }

            return null;
        }


        public async Task<IEnumerable<ShiftPlannerDto>> GetAllAsync()
        {
            var orgId = GetCurrentOrgId();

            var query = _context.ShiftPlanners
                .Include(x => x.Shift)
                .AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value));
            }

            return await query
                .Select(x => new ShiftPlannerDto
                {
                    PlannerId = x.PlannerId,
                    ShiftId = x.ShiftId,
                    ShiftName = x.Shift != null ? x.Shift.ShiftName : "",
                    FromDate = x.FromDate,
                    ToDate = x.ToDate,
                    Department_Id = x.Department_Id,
                    Remarks = x.Remarks,
                    IsPublished = x.IsPublished,
                    CreatedBy = x.CreatedBy,
                    CreatedDate = x.CreatedDate
                })
                .OrderByDescending(x => x.FromDate)
                .ToListAsync();
        }


        public async Task<ShiftPlannerDto?> GetByIdAsync(int plannerId)
        {
            var orgId = GetCurrentOrgId();

            var query = _context.ShiftPlanners
                .Include(x => x.Shift)
                .Where(x => x.PlannerId == plannerId);

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value));
            }

            return await query
                .Select(x => new ShiftPlannerDto
                {
                    PlannerId = x.PlannerId,
                    ShiftId = x.ShiftId,
                    ShiftName = x.Shift != null ? x.Shift.ShiftName : "",
                    FromDate = x.FromDate,
                    ToDate = x.ToDate,
                    Department_Id = x.Department_Id,
                    Remarks = x.Remarks,
                    IsPublished = x.IsPublished,
                    CreatedBy = x.CreatedBy,
                    CreatedDate = x.CreatedDate
                })
                .FirstOrDefaultAsync();
        }

        public async Task<bool> CreateAsync(CreateShiftPlannerDto dto)

        {
            var orgId = GetCurrentOrgId();

            // Validate shift belongs to caller's organization
            var shiftExists = await _context.ShiftMasters
                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (!shiftExists)

                return false;

            // Validate dates

            if (dto.FromDate == default ||

                dto.ToDate == default ||

                dto.ToDate.Date < dto.FromDate.Date)

            {

                return false;

            }

            // Prevent overlapping planner for same department

            bool exists = await _context.ShiftPlanners.AnyAsync(x =>
                  (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                  x.Department_Id == dto.Department_Id &&
                  dto.FromDate.Date <= x.ToDate.Date &&
                  dto.ToDate.Date >= x.FromDate.Date);

            if (exists)

                return false;

            if (!orgId.HasValue || orgId.Value <= 0)
            {
                var shift = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(x => x.ShiftId == dto.ShiftId);
                if (shift != null && shift.OrganizationId > 0)
                {
                    orgId = shift.OrganizationId;
                }
            }

            if (!orgId.HasValue || orgId.Value <= 0)
            {
                throw new InvalidOperationException("Cannot create a shift plan without a valid Organization context.");
            }

            var planner = new ShiftPlanner

            {
                OrganizationId = orgId.Value,
                ShiftId = dto.ShiftId,

                FromDate = dto.FromDate,

                ToDate = dto.ToDate,

                Department_Id = dto.Department_Id,

                Remarks = dto.Remarks,

                CreatedBy = dto.CreatedBy,

                CreatedDate = DateTime.Now,

                IsPublished = false

            };

            _context.ShiftPlanners.Add(planner);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> UpdateAsync(

            int plannerId,

            UpdateShiftPlannerDto dto)

        {
            var orgId = GetCurrentOrgId();

            var planner = await _context.ShiftPlanners
                .Include(x => x.Shift)
                .FirstOrDefaultAsync(x => x.PlannerId == plannerId && (!orgId.HasValue || x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value)));

            if (planner == null)

                return false;

            // Validate shift
            var shiftExists = await _context.ShiftMasters
                           .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (!shiftExists)

                return false;

            // Validate dates

            if (dto.FromDate == default ||

                dto.ToDate == default ||

                dto.ToDate.Date < dto.FromDate.Date)

            {

                return false;

            }

            // Prevent overlap with another planner

            bool exists = await _context.ShiftPlanners.AnyAsync(x =>
                 x.PlannerId != plannerId &&
                 (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                 x.Department_Id == dto.Department_Id &&
                 dto.FromDate.Date <= x.ToDate.Date &&
                 dto.ToDate.Date >= x.FromDate.Date);

            if (exists)

                return false;

            planner.ShiftId = dto.ShiftId;

            planner.FromDate = dto.FromDate;

            planner.ToDate = dto.ToDate;

            planner.Department_Id = dto.Department_Id;

            planner.Remarks = dto.Remarks;

            planner.IsPublished = dto.IsPublished;

            planner.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> DeleteAsync(int plannerId)

        {

            var orgId = GetCurrentOrgId();

            var planner = await _context.ShiftPlanners
                .Include(x => x.Shift)
                .FirstOrDefaultAsync(x => x.PlannerId == plannerId && (!orgId.HasValue || x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value)));


            if (planner == null)

                return false;

            _context.ShiftPlanners.Remove(planner);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> PublishAsync(int plannerId)

        {

            var orgId = GetCurrentOrgId();
            var planner = await _context.ShiftPlanners
                .Include(x => x.Shift)
                .FirstOrDefaultAsync(x => x.PlannerId == plannerId && (!orgId.HasValue || x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value)));

            if (planner == null)

                return false;

            planner.IsPublished = true;

            planner.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> CopyWeekAsync(

            DateTime fromWeekStart,

            DateTime toWeekStart)

        {

            var orgId = GetCurrentOrgId();

            var planners = await _context.ShiftPlanners
                .Include(x => x.Shift)
                .Where(x =>
                    x.FromDate >= fromWeekStart &&
                    x.ToDate <= fromWeekStart.AddDays(6) &&
                    (!orgId.HasValue || x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value)))
                .ToListAsync();

            if (!planners.Any())

                return false;

            foreach (var item in planners)

            {

                var daysOffset = (toWeekStart.Date - fromWeekStart.Date).Days;
                var newFrom = item.FromDate.AddDays(daysOffset);
                var newTo = item.ToDate.AddDays(daysOffset);

                bool exists = await _context.ShiftPlanners.AnyAsync(x =>
                                   (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                                   x.Department_Id == item.Department_Id &&
                                   newFrom.Date <= x.ToDate.Date &&
                                   newTo.Date >= x.FromDate.Date);

                if (exists)

                    continue;

                _context.ShiftPlanners.Add(new ShiftPlanner

                {
                    OrganizationId = orgId ?? (item.OrganizationId > 0 ? item.OrganizationId : (item.Shift != null && item.Shift.OrganizationId > 0 ? item.Shift.OrganizationId : throw new InvalidOperationException("OrganizationId could not be determined."))),
                    ShiftId = item.ShiftId,

                    FromDate = newFrom,

                    ToDate = newTo,

                    Department_Id = item.Department_Id,

                    Remarks = item.Remarks,

                    CreatedBy = item.CreatedBy,

                    CreatedDate = DateTime.Now,

                    IsPublished = false

                });

            }

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> CopyMonthAsync(

            int sourceMonth,

            int sourceYear,

            int targetMonth,

            int targetYear)

        {


            var orgId = GetCurrentOrgId();
            var planners = await _context.ShiftPlanners
                .Include(x => x.Shift)
                .Where(x =>
                    x.FromDate.Month == sourceMonth &&
                    x.FromDate.Year == sourceYear &&
                    (!orgId.HasValue || x.OrganizationId == orgId.Value || (x.Shift != null && x.Shift.OrganizationId == orgId.Value)))
                .ToListAsync();

            if (!planners.Any())

                return false;

            foreach (var item in planners)

            {

                int fromDay = Math.Min(

                    item.FromDate.Day,

                    DateTime.DaysInMonth(targetYear, targetMonth));

                int toDay = Math.Min(

                    item.ToDate.Day,

                    DateTime.DaysInMonth(targetYear, targetMonth));

                var from = new DateTime(

                    targetYear,

                    targetMonth,

                    fromDay);

                var to = new DateTime(

                    targetYear,

                    targetMonth,

                    toDay);

                bool exists = await _context.ShiftPlanners.AnyAsync(x =>
                   (!orgId.HasValue || x.OrganizationId == orgId.Value) &&
                   x.Department_Id == item.Department_Id &&
                   from.Date <= x.ToDate.Date &&
                   to.Date >= x.FromDate.Date);

                if (exists)

                    continue;

                _context.ShiftPlanners.Add(new ShiftPlanner

                {
                    OrganizationId = orgId ?? (item.OrganizationId > 0 ? item.OrganizationId : (item.Shift != null && item.Shift.OrganizationId > 0 ? item.Shift.OrganizationId : throw new InvalidOperationException("OrganizationId could not be determined."))),
                    ShiftId = item.ShiftId,

                    FromDate = from,

                    ToDate = to,

                    Department_Id = item.Department_Id,

                    Remarks = item.Remarks,

                    CreatedBy = item.CreatedBy,

                    CreatedDate = DateTime.Now,

                    IsPublished = false

                });

            }

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
