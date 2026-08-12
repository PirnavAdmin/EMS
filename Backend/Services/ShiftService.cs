using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftService : IShiftService

    {

        private readonly AppDbContext _context;

        public ShiftService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<IEnumerable<ShiftResponseDto>> GetAllAsync()

        {

            return await _context.ShiftMasters

                .OrderBy(x => x.ShiftName)

                .Select(x => new ShiftResponseDto

                {

                    ShiftId = x.ShiftId,

                    ShiftCode = x.ShiftCode,

                    ShiftName = x.ShiftName,

                    StartTime = x.StartTime,

                    EndTime = x.EndTime,

                    BreakStart = x.BreakStart,

                    BreakEnd = x.BreakEnd,

                    GraceTimeMinutes = x.GraceTimeMinutes,

                    HalfDayHours = x.HalfDayHours,

                    FullDayHours = x.FullDayHours,

                    WeeklyOff = x.WeeklyOff,

                    ShiftEndNextDay = x.ShiftEndNextDay,

                    IsNightShift = x.IsNightShift,

                    ShiftAllowance = x.ShiftAllowance,

                    OTHoursAfter = x.OTHoursAfter,

                    MaxOTHours = x.MaxOTHours,

                    IsFlexibleShift = x.IsFlexibleShift,

                    AutoCheckoutHours = x.AutoCheckoutHours,

                    EarlyCheckInMinutes = x.EarlyCheckInMinutes,

                    LateCheckoutMinutes = x.LateCheckoutMinutes,

                    IsActive = x.IsActive,

                    CreatedDate = x.CreatedDate

                })

                .ToListAsync();

        }

        public async Task<ShiftResponseDto?> GetByIdAsync(int shiftId)

        {

            var shift = await _context.ShiftMasters

                .FirstOrDefaultAsync(x => x.ShiftId == shiftId);

            if (shift == null)

                return null;

            return new ShiftResponseDto

            {

                ShiftId = shift.ShiftId,

                ShiftCode = shift.ShiftCode,

                ShiftName = shift.ShiftName,

                StartTime = shift.StartTime,

                EndTime = shift.EndTime,

                BreakStart = shift.BreakStart,

                BreakEnd = shift.BreakEnd,

                GraceTimeMinutes = shift.GraceTimeMinutes,

                HalfDayHours = shift.HalfDayHours,

                FullDayHours = shift.FullDayHours,

                WeeklyOff = shift.WeeklyOff,

                ShiftEndNextDay = shift.ShiftEndNextDay,

                IsNightShift = shift.IsNightShift,

                ShiftAllowance = shift.ShiftAllowance,

                OTHoursAfter = shift.OTHoursAfter,

                MaxOTHours = shift.MaxOTHours,

                IsFlexibleShift = shift.IsFlexibleShift,

                AutoCheckoutHours = shift.AutoCheckoutHours,

                EarlyCheckInMinutes = shift.EarlyCheckInMinutes,

                LateCheckoutMinutes = shift.LateCheckoutMinutes,

                IsActive = shift.IsActive,

                CreatedDate = shift.CreatedDate

            };

        }

        public async Task<string> CreateAsync(CreateShiftDto dto)

        {

            dto.ShiftCode = dto.ShiftCode.Trim();

            dto.ShiftName = dto.ShiftName.Trim();

            if (await _context.ShiftMasters

                .AnyAsync(x => x.ShiftCode == dto.ShiftCode))

            {

                return "Shift Code already exists.";

            }

            if (dto.StartTime == dto.EndTime && dto.ShiftEndNextDay == 0)

            {

                return "Start time and end time cannot be the same for a same-day shift.";

            }

            if (dto.GraceTimeMinutes < 0)

                return "Grace time cannot be negative.";

            if (dto.HalfDayHours < 0)

                return "Half day hours cannot be negative.";

            if (dto.FullDayHours <= 0)

                return "Full day hours must be greater than zero.";

            if (dto.OTHoursAfter < 0)

                return "OT hours after cannot be negative.";

            if (dto.MaxOTHours < 0)

                return "Maximum OT hours cannot be negative.";

            if (dto.AutoCheckoutHours <= 0)

                return "Auto checkout hours must be greater than zero.";

            if (dto.EarlyCheckInMinutes < 0)

                return "Early check-in minutes cannot be negative.";

            if (dto.LateCheckoutMinutes < 0)

                return "Late checkout minutes cannot be negative.";

            var shift = new ShiftMaster

            {

                ShiftCode = dto.ShiftCode,

                ShiftName = dto.ShiftName,

                StartTime = dto.StartTime,

                EndTime = dto.EndTime,

                BreakStart = dto.BreakStart,

                BreakEnd = dto.BreakEnd,

                GraceTimeMinutes = dto.GraceTimeMinutes,

                HalfDayHours = dto.HalfDayHours,

                FullDayHours = dto.FullDayHours,

                WeeklyOff = dto.WeeklyOff,

                ShiftEndNextDay = dto.ShiftEndNextDay,

                IsNightShift = dto.IsNightShift,

                ShiftAllowance = dto.ShiftAllowance,

                OTHoursAfter = dto.OTHoursAfter,

                MaxOTHours = dto.MaxOTHours,

                IsFlexibleShift = dto.IsFlexibleShift,

                AutoCheckoutHours = dto.AutoCheckoutHours,

                EarlyCheckInMinutes = dto.EarlyCheckInMinutes,

                LateCheckoutMinutes = dto.LateCheckoutMinutes,

                IsActive = dto.IsActive,

                CreatedDate = DateTime.Now

            };

            _context.ShiftMasters.Add(shift);

            await _context.SaveChangesAsync();

            return "Shift created successfully.";

        }

        public async Task<string> UpdateAsync(UpdateShiftDto dto)

        {

            var shift = await _context.ShiftMasters

                .FindAsync(dto.ShiftId);

            if (shift == null)

                return "Shift not found.";

            dto.ShiftCode = dto.ShiftCode.Trim();

            dto.ShiftName = dto.ShiftName.Trim();

            if (await _context.ShiftMasters.AnyAsync(x =>

                x.ShiftCode == dto.ShiftCode &&

                x.ShiftId != dto.ShiftId))

            {

                return "Shift Code already exists.";

            }

            if (dto.StartTime == dto.EndTime && dto.ShiftEndNextDay == 0)

            {

                return "Start time and end time cannot be the same for a same-day shift.";

            }

            if (dto.GraceTimeMinutes < 0)

                return "Grace time cannot be negative.";

            if (dto.HalfDayHours < 0)

                return "Half day hours cannot be negative.";

            if (dto.FullDayHours <= 0)

                return "Full day hours must be greater than zero.";

            if (dto.OTHoursAfter < 0)

                return "OT hours after cannot be negative.";

            if (dto.MaxOTHours < 0)

                return "Maximum OT hours cannot be negative.";

            if (dto.AutoCheckoutHours <= 0)

                return "Auto checkout hours must be greater than zero.";

            if (dto.EarlyCheckInMinutes < 0)

                return "Early check-in minutes cannot be negative.";

            if (dto.LateCheckoutMinutes < 0)

                return "Late checkout minutes cannot be negative.";

            shift.ShiftCode = dto.ShiftCode;

            shift.ShiftName = dto.ShiftName;

            shift.StartTime = dto.StartTime;

            shift.EndTime = dto.EndTime;

            shift.BreakStart = dto.BreakStart;

            shift.BreakEnd = dto.BreakEnd;

            shift.GraceTimeMinutes = dto.GraceTimeMinutes;

            shift.HalfDayHours = dto.HalfDayHours;

            shift.FullDayHours = dto.FullDayHours;

            shift.WeeklyOff = dto.WeeklyOff;

            shift.ShiftEndNextDay = dto.ShiftEndNextDay;

            shift.IsNightShift = dto.IsNightShift;

            shift.ShiftAllowance = dto.ShiftAllowance;

            shift.OTHoursAfter = dto.OTHoursAfter;

            shift.MaxOTHours = dto.MaxOTHours;

            shift.IsFlexibleShift = dto.IsFlexibleShift;

            shift.AutoCheckoutHours = dto.AutoCheckoutHours;

            shift.EarlyCheckInMinutes = dto.EarlyCheckInMinutes;

            shift.LateCheckoutMinutes = dto.LateCheckoutMinutes;

            shift.IsActive = dto.IsActive;

            shift.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Shift updated successfully.";

        }

        public async Task<string> DeleteAsync(int shiftId)

        {

            var shift = await _context.ShiftMasters

                .FindAsync(shiftId);

            if (shift == null)

                return "Shift not found.";

            // Don't allow deletion if this shift is already assigned

            bool isAssigned = await _context.EmployeeShiftAssignments

                .AnyAsync(x => x.ShiftId == shiftId);

            if (isAssigned)

                return "Shift cannot be deleted because it is assigned to employees.";

            _context.ShiftMasters.Remove(shift);

            await _context.SaveChangesAsync();

            return "Shift deleted successfully.";

        }

    }

}
