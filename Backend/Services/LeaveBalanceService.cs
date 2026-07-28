using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class LeaveBalanceService : ILeaveBalanceService
    {
        private readonly AppDbContext _context;

        public LeaveBalanceService(AppDbContext context)
        {
            _context = context;
        }

        private async Task<EmployeeMonthlyLeaveBalance> GetOrCreateMonthlyBalance(
    string employeeId,
    int year,
    int month)
        {
            var balance = await _context.EmployeeMonthlyLeaveBalances
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == employeeId &&
                    x.LeaveYear == year &&
                    x.LeaveMonth == month);

            if (balance != null)
                return balance;

            var previousMonth = await _context.EmployeeMonthlyLeaveBalances
                .Where(x => x.Employee_Id == employeeId)
                .OrderByDescending(x => x.LeaveYear)
                .ThenByDescending(x => x.LeaveMonth)
                .FirstOrDefaultAsync();

            int carryForward = previousMonth?.RemainingLeaves ?? 0;

            balance = new EmployeeMonthlyLeaveBalance
            {
                Employee_Id = employeeId,
                LeaveYear = year,
                LeaveMonth = month,

                MonthlyCredit = 1,
                CarryForward = carryForward,

                AvailableLeaves = carryForward + 1,
                UsedLeaves = 0,
                RemainingLeaves = carryForward + 1,

                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.EmployeeMonthlyLeaveBalances.Add(balance);
            await _context.SaveChangesAsync();

            return balance;
        }
        private async Task<bool> IsHoliday(DateTime date)
        {
            return await _context.Holidays
                .AnyAsync(x => x.Holiday_Date.Date == date.Date);
        }
        private bool IsWeekend(DateTime date)
        {
            return date.DayOfWeek == DayOfWeek.Saturday
                || date.DayOfWeek == DayOfWeek.Sunday;
        }
        private async Task<List<DateTime>> GenerateChargeableLeaveDates(
    string employeeId,
    DateTime fromDate,
    DateTime toDate)
        {
            var dates = new List<DateTime>();

            // Selected leave dates
            for (var d = fromDate.Date; d <= toDate.Date; d = d.AddDays(1))
            {
                dates.Add(d);
            }

            // Previous approved leave
            var previousLeave = await _context.EmployeeLeaves
                .Where(x =>
                    x.EmployeeId == employeeId &&
                   x.Status != null &&
x.Status.StartsWith("Approved") &&
                    x.ToDate.Date < fromDate.Date)
                .OrderByDescending(x => x.ToDate)
                .FirstOrDefaultAsync();

            if (previousLeave != null)
            {
                var gapStart = previousLeave.ToDate.Date.AddDays(1);
                var gapEnd = fromDate.Date.AddDays(-1);

                bool sandwich = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    if (!IsWeekend(d) &&
                        !await IsHoliday(d))
                    {
                        sandwich = false;
                        break;
                    }
                }

                if (sandwich)
                {
                    for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                    {
                        dates.Add(d);
                    }
                }
            }

            // Next approved leave
            var nextLeave = await _context.EmployeeLeaves
                .Where(x =>
                    x.EmployeeId == employeeId &&
                   x.Status != null &&
x.Status.StartsWith("Approved") &&
                    x.FromDate.Date > toDate.Date)
                .OrderBy(x => x.FromDate)
                .FirstOrDefaultAsync();

            if (nextLeave != null)
            {
                var gapStart = toDate.Date.AddDays(1);
                var gapEnd = nextLeave.FromDate.Date.AddDays(-1);

                bool sandwich = true;

                for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                {
                    if (!IsWeekend(d) &&
                        !await IsHoliday(d))
                    {
                        sandwich = false;
                        break;
                    }
                }

                if (sandwich)
                {
                    for (var d = gapStart; d <= gapEnd; d = d.AddDays(1))
                    {
                        dates.Add(d);
                    }
                }
            }

            return dates
                .Distinct()
                .OrderBy(x => x)
                .ToList();
        }
        private Dictionary<(int Year, int Month), List<DateTime>> SplitByMonth(
    List<DateTime> dates)
        {
            return dates
                .GroupBy(x => (x.Year, x.Month))
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderBy(x => x).ToList());
        }
        public async Task<(int PaidLeaves, int LopDays)> ApproveLeaveAsync(EmployeeLeave leave)
        {
            if (leave == null)
                throw new ArgumentNullException(nameof(leave));

            int paidLeaves = 0;
            int lopDays = 0;

            // Get all chargeable dates (including sandwich days)
            var chargeableDates = await GenerateChargeableLeaveDates(
                leave.EmployeeId!,
                leave.FromDate,
                leave.ToDate);

            // Split by month
            var monthGroups = SplitByMonth(chargeableDates);

            foreach (var month in monthGroups)
            {
                int year = month.Key.Year;
                int monthNumber = month.Key.Month;

                var balance = await GetOrCreateMonthlyBalance(
                    leave.EmployeeId!,
                    year,
                    monthNumber);

                foreach (var day in month.Value)
                {
                    var attendance = await _context.Attendance
                        .FirstOrDefaultAsync(a =>
                            a.Employee_Id == leave.EmployeeId &&
                            a.Attendance_Date.Date == day.Date);

                    if (attendance == null)
                    {
                        attendance = new Attendance
                        {
                            Employee_Id = leave.EmployeeId!,
                            Attendance_Date = day.Date,
                            Check_In = null,
                            Check_Out = null,
                            WorkingMinutes = 0,
                            TotalBreakMinutes = 0
                        };

                        _context.Attendance.Add(attendance);
                    }

                    if (balance.RemainingLeaves > 0)
                    {
                        balance.UsedLeaves++;
                        balance.RemainingLeaves--;

                        attendance.Status = "OL";

                        paidLeaves++;
                    }
                    else
                    {
                        balance.LopLeaves++;
                        attendance.Status = "LOP";

                        lopDays++;
                    }
                }

                balance.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return (paidLeaves, lopDays);
        }

        public async Task RestoreLeaveAsync(EmployeeLeave leave)
        {
            if (leave == null)
                throw new ArgumentNullException(nameof(leave));

            int paidLeavesToRestore = leave.PaidLeaveDays;

            if (paidLeavesToRestore <= 0)
                return;

            var chargeableDates = await GenerateChargeableLeaveDates(
                leave.EmployeeId!,
                leave.FromDate,
                leave.ToDate);

            var monthGroups = SplitByMonth(chargeableDates);

            foreach (var month in monthGroups)
            {
                if (paidLeavesToRestore <= 0)
                    break;

                var balance = await _context.EmployeeMonthlyLeaveBalances
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == leave.EmployeeId &&
                        x.LeaveYear == month.Key.Year &&
                        x.LeaveMonth == month.Key.Month);

                if (balance == null)
                    continue;

                foreach (var day in month.Value)
                {
                    if (paidLeavesToRestore == 0)
                        break;

                    balance.UsedLeaves--;

                    if (balance.UsedLeaves < 0)
                        balance.UsedLeaves = 0;

                    balance.RemainingLeaves++;

                    paidLeavesToRestore--;
                }

                balance.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
    }
}