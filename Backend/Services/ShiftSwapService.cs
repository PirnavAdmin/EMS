using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class ShiftSwapService : IShiftSwapService

    {

        private readonly AppDbContext _context;

        public ShiftSwapService(AppDbContext context)

        {

            _context = context;

        }

        public async Task<IEnumerable<ShiftSwap>> GetAllAsync()

        {

            return await _context.ShiftSwaps

                .OrderByDescending(x => x.CreatedDate)

                .ToListAsync();

        }

        public async Task<ShiftSwap?> GetByIdAsync(int id)

        {

            return await _context.ShiftSwaps

                .FindAsync(id);

        }

        public async Task<bool> RequestSwapAsync(CreateShiftSwapDto dto)

        {

            // Employees cannot swap with themselves

            if (string.IsNullOrWhiteSpace(dto.FromEmployeeId) ||

                string.IsNullOrWhiteSpace(dto.ToEmployeeId))

            {

                return false;

            }

            if (dto.FromEmployeeId == dto.ToEmployeeId)

                return false;

            // Validate From employee

            var fromEmployeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == dto.FromEmployeeId);

            if (!fromEmployeeExists)

                return false;

            // Validate To employee

            var toEmployeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == dto.ToEmployeeId);

            if (!toEmployeeExists)

                return false;

            // Validate shift

            var shiftExists = await _context.ShiftMasters

                .AnyAsync(x =>

                    x.ShiftId == dto.ShiftId &&

                    x.IsActive);

            if (!shiftExists)

                return false;

            if (dto.ShiftDate == default)

                return false;

            // Check that From employee has roster for that date

            var fromRoster = await _context.ShiftRosters

                .FirstOrDefaultAsync(x =>

                    x.Employee_Id == dto.FromEmployeeId &&

                    x.RosterDate.Date == dto.ShiftDate.Date);

            if (fromRoster == null)

                return false;

            // Check that To employee has roster for that date

            var toRoster = await _context.ShiftRosters

                .FirstOrDefaultAsync(x =>

                    x.Employee_Id == dto.ToEmployeeId &&

                    x.RosterDate.Date == dto.ShiftDate.Date);

            if (toRoster == null)

                return false;

            // Prevent duplicate pending request

            var exists = await _context.ShiftSwaps.AnyAsync(x =>

                x.FromEmployeeId == dto.FromEmployeeId &&

                x.ToEmployeeId == dto.ToEmployeeId &&

                x.ShiftDate.Date == dto.ShiftDate.Date &&

                x.Status == "Pending");

            if (exists)

                return false;

            var swap = new ShiftSwap

            {

                FromEmployeeId = dto.FromEmployeeId,

                ToEmployeeId = dto.ToEmployeeId,

                ShiftDate = dto.ShiftDate.Date,

                ShiftId = dto.ShiftId,

                Reason = dto.Reason,

                Status = "Pending",

                CreatedDate = DateTime.Now

            };

            _context.ShiftSwaps.Add(swap);

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> ApproveSwapAsync(

            ApproveShiftSwapDto dto)

        {

            var swap = await _context.ShiftSwaps

                .FirstOrDefaultAsync(x => x.SwapId == dto.SwapId);

            if (swap == null)

                return false;

            // Already processed

            if (swap.Status != "Pending")

                return false;

            if (dto.Approve &&

                string.IsNullOrWhiteSpace(dto.ApprovedBy))

            {

                return false;

            }

            swap.Status = dto.Approve

                ? "Approved"

                : "Rejected";

            swap.ApprovedBy = dto.ApprovedBy;

            swap.ApprovedDate = DateTime.Now;

            if (dto.Approve)

            {

                var emp1 = await _context.ShiftRosters

                    .FirstOrDefaultAsync(x =>

                        x.Employee_Id == swap.FromEmployeeId &&

                        x.RosterDate.Date == swap.ShiftDate.Date);

                var emp2 = await _context.ShiftRosters

                    .FirstOrDefaultAsync(x =>

                        x.Employee_Id == swap.ToEmployeeId &&

                        x.RosterDate.Date == swap.ShiftDate.Date);

                if (emp1 == null || emp2 == null)

                    return false;

                // Swap the actual roster shifts

                int temp = emp1.ShiftId;

                emp1.ShiftId = emp2.ShiftId;

                emp2.ShiftId = temp;

            }

            await _context.SaveChangesAsync();

            return true;

        }

        public async Task<bool> DeleteAsync(int id)

        {

            var swap = await _context.ShiftSwaps

                .FindAsync(id);

            if (swap == null)

                return false;

            // Don't delete an already approved swap

            if (swap.Status == "Approved")

                return false;

            _context.ShiftSwaps.Remove(swap);

            await _context.SaveChangesAsync();

            return true;

        }

    }

}
