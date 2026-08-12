using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftRosterService : IShiftRosterService

    {

        private readonly AppDbContext _context;

        public ShiftRosterService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<bool> CreateAsync(CreateShiftRosterDto dto)

        {

            // Validate employee

            var employeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == dto.Employee_Id);

            if (!employeeExists)

                return false;

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive);

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

            var roster = await _context.ShiftRosters.FindAsync(id);

            if (roster == null)

                return false;

            _context.ShiftRosters.Remove(roster);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<IEnumerable<ShiftRosterResponseDto>> GetAllAsync()

        {

            return await _context.ShiftRosters

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

            return await _context.ShiftRosters

                .Where(x => x.RosterId == id)

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

        public async Task<IEnumerable<ShiftRosterResponseDto>> GetEmployeeRosterAsync(

            string employeeId)

        {

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

        public async Task<bool> UpdateAsync(

            int id,

            UpdateShiftRosterDto dto)

        {

            var roster = await _context.ShiftRosters

                .FindAsync(id);

            if (roster == null)

                return false;

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive);

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

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x => x.ShiftId == dto.ShiftId && x.IsActive);

            if (!shiftExists)

                return false;

            // Validate all employees first

            var employeeIds = dto.EmployeeIds

                .Where(x => !string.IsNullOrWhiteSpace(x))

                .Distinct()

                .ToList();

            var validEmployeeIds = await _context.Employees

                .Where(x => employeeIds.Contains(x.Employee_Id))

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
