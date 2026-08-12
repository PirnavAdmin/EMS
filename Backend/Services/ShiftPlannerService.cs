using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftPlannerService : IShiftPlannerService

    {

        private readonly AppDbContext _context;

        public ShiftPlannerService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<IEnumerable<ShiftPlannerDto>> GetAllAsync()

        {

            return await _context.ShiftPlanners

                .Include(x => x.Shift)

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

            return await _context.ShiftPlanners

                .Include(x => x.Shift)

                .Where(x => x.PlannerId == plannerId)

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

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive);

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

                x.Department_Id == dto.Department_Id &&

                dto.FromDate.Date <= x.ToDate.Date &&

                dto.ToDate.Date >= x.FromDate.Date);

            if (exists)

                return false;

            var planner = new ShiftPlanner

            {

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

            var planner = await _context.ShiftPlanners

                .FindAsync(plannerId);

            if (planner == null)

                return false;

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive);

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

            var planner = await _context.ShiftPlanners

                .FindAsync(plannerId);

            if (planner == null)

                return false;

            _context.ShiftPlanners.Remove(planner);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> PublishAsync(int plannerId)

        {

            var planner = await _context.ShiftPlanners

                .FindAsync(plannerId);

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

            var planners = await _context.ShiftPlanners

                .Where(x =>

                    x.FromDate >= fromWeekStart &&

                    x.ToDate <= fromWeekStart.AddDays(6))

                .ToListAsync();

            if (!planners.Any())

                return false;

            foreach (var item in planners)

            {

                var newFrom = item.FromDate.AddDays(7);

                var newTo = item.ToDate.AddDays(7);

                bool exists = await _context.ShiftPlanners.AnyAsync(x =>

                    x.Department_Id == item.Department_Id &&

                    newFrom.Date <= x.ToDate.Date &&

                    newTo.Date >= x.FromDate.Date);

                if (exists)

                    continue;

                _context.ShiftPlanners.Add(new ShiftPlanner

                {

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

            var planners = await _context.ShiftPlanners

                .Where(x =>

                    x.FromDate.Month == sourceMonth &&

                    x.FromDate.Year == sourceYear)

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

                    x.Department_Id == item.Department_Id &&

                    from.Date <= x.ToDate.Date &&

                    to.Date >= x.FromDate.Date);

                if (exists)

                    continue;

                _context.ShiftPlanners.Add(new ShiftPlanner

                {

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
