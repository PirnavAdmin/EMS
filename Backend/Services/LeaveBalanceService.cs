using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
            // =====================================================
            // 1. CHECK WHETHER REQUESTED MONTH ALREADY EXISTS
            // =====================================================
            var existingBalance = await _context.EmployeeMonthlyLeaveBalances
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == employeeId &&
                    x.LeaveYear == year &&
                    x.LeaveMonth == month);

            if (existingBalance != null)
                return existingBalance;


            // =====================================================
            // 2. GET EMPLOYEE
            // =====================================================
            var employee = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == employeeId);

            if (employee == null)
                throw new Exception("Employee not found.");


            // =====================================================
            // 3. PAID LEAVE STARTS AFTER 6 MONTHS PROBATION
            // =====================================================
            DateTime probationEndDate = employee.JoiningDate.Date.AddMonths(6);

            DateTime requestedMonth =
                new DateTime(year, month, 1);

            DateTime eligibilityMonth =
                new DateTime(
                    probationEndDate.Year,
                    probationEndDate.Month,
                    1);


            // =====================================================
            // 4. REQUESTED MONTH BEFORE LEAVE ELIGIBILITY
            // =====================================================
            if (requestedMonth < eligibilityMonth)
            {
                var zeroBalance = new EmployeeMonthlyLeaveBalance
                {
                    Employee_Id = employeeId,

                    LeaveYear = year,
                    LeaveMonth = month,

                    MonthlyCredit = 0,
                    CarryForward = 0,
                    AvailableLeaves = 0,
                    UsedLeaves = 0,
                    LopLeaves = 0,
                    RemainingLeaves = 0,

                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.EmployeeMonthlyLeaveBalances.Add(zeroBalance);

                await _context.SaveChangesAsync();

                return zeroBalance;
            }


            // =====================================================
            // 5. FIND LATEST BALANCE BEFORE REQUESTED MONTH
            // =====================================================
            var previousBalance = await _context.EmployeeMonthlyLeaveBalances
                .Where(x =>
                    x.Employee_Id == employeeId &&
                    (
                        x.LeaveYear < year ||
                        (x.LeaveYear == year &&
                         x.LeaveMonth < month)
                    ))
                .OrderByDescending(x => x.LeaveYear)
                .ThenByDescending(x => x.LeaveMonth)
                .FirstOrDefaultAsync();


            // =====================================================
            // 6. DETERMINE FROM WHICH MONTH WE NEED TO CREATE
            //    MISSING MONTHLY BALANCES
            // =====================================================

            DateTime startMonth;

            int carryForward = 0;

            if (previousBalance != null)
            {
                startMonth = new DateTime(
                    previousBalance.LeaveYear,
                    previousBalance.LeaveMonth,
                    1)
                    .AddMonths(1);

                carryForward = previousBalance.RemainingLeaves;

                // Never start before employee eligibility
                if (startMonth < eligibilityMonth)
                    startMonth = eligibilityMonth;
            }
            else
            {
                // No balance exists yet.
                // Start from employee's probation completion month.
                startMonth = eligibilityMonth;
            }


            // =====================================================
            // 7. CREATE ALL MISSING MONTHS UP TO REQUESTED MONTH
            //
            // Example:
            //
            // July      +1
            // August    +1
            // September +1
            //
            // If nothing used:
            // September Remaining = 3
            // =====================================================

            EmployeeMonthlyLeaveBalance? requestedBalance = null;

            for (DateTime currentMonth = startMonth;
                 currentMonth <= requestedMonth;
                 currentMonth = currentMonth.AddMonths(1))
            {
                // Check again in case this month already exists
                var monthBalance = await _context.EmployeeMonthlyLeaveBalances
                    .FirstOrDefaultAsync(x =>
                        x.Employee_Id == employeeId &&
                        x.LeaveYear == currentMonth.Year &&
                        x.LeaveMonth == currentMonth.Month);

                if (monthBalance != null)
                {
                    carryForward = monthBalance.RemainingLeaves;

                    if (currentMonth.Year == year &&
                        currentMonth.Month == month)
                    {
                        requestedBalance = monthBalance;
                    }

                    continue;
                }


                // Every eligible month gets 1 leave
                int monthlyCredit = 1;

                int availableLeaves =
                    carryForward + monthlyCredit;


                monthBalance = new EmployeeMonthlyLeaveBalance
                {
                    Employee_Id = employeeId,

                    LeaveYear = currentMonth.Year,
                    LeaveMonth = currentMonth.Month,

                    MonthlyCredit = monthlyCredit,

                    // Previous month's unused balance
                    CarryForward = carryForward,

                    // Carry Forward + Current Month Credit
                    AvailableLeaves = availableLeaves,

                    UsedLeaves = 0,

                    LopLeaves = 0,

                    // Nothing used yet in newly created month
                    RemainingLeaves = availableLeaves,

                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };


                _context.EmployeeMonthlyLeaveBalances.Add(monthBalance);

                // Pass remaining leaves to next month
                carryForward = monthBalance.RemainingLeaves;


                if (currentMonth.Year == year &&
                    currentMonth.Month == month)
                {
                    requestedBalance = monthBalance;
                }
            }


            // =====================================================
            // 8. SAVE ALL CREATED MONTHS
            // =====================================================
            await _context.SaveChangesAsync();


            // =====================================================
            // 9. RETURN REQUESTED MONTH
            // =====================================================
            if (requestedBalance == null)
            {
                requestedBalance =
                    await _context.EmployeeMonthlyLeaveBalances
                        .FirstAsync(x =>
                            x.Employee_Id == employeeId &&
                            x.LeaveYear == year &&
                            x.LeaveMonth == month);
            }

            return requestedBalance;
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

        public async Task<object?> GetLeaveBalanceByEmployeeId(string employeeId)
        {
            if (string.IsNullOrWhiteSpace(employeeId))
                throw new ArgumentException("Employee ID is required.");

            // 1. Check employee exists
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

            if (employee == null)
                return null;

            int currentYear = DateTime.Today.Year;

            // 2. Get Leave Settings
            var leaveSettings = await _context.LeaveSettings
                .AsNoTracking()
                .FirstOrDefaultAsync();

            // Same as Admin Monthly Attendance
            int totalLeaves = leaveSettings?.MaxLeaveDays ?? 12;

            // 3. Get employee monthly balances for current year
            var employeeBalances = await _context.EmployeeMonthlyLeaveBalances
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == employeeId &&
                    x.LeaveYear == currentYear)
                .ToListAsync();

            // 4. Paid leaves used
            int paidLeaves = employeeBalances.Sum(x => x.UsedLeaves);

            // UL should contain only paid leaves actually consumed
            int usedLeaves = paidLeaves;

            int balanceLeaves = totalLeaves - usedLeaves;

            if (balanceLeaves < 0)
            {
                balanceLeaves = 0;
            }

            if (balanceLeaves < 0)
            {
                balanceLeaves = 0;
            }

            return new
            {
                EmployeeId = employee.Employee_Id,
                EmployeeName = employee.Name,

                TL = totalLeaves,
                UL = usedLeaves,
                BL = balanceLeaves
            };
        }

        public async Task<object?> GetMyLeaveBalance(ClaimsPrincipal user)
        {
            // 1. Get email from JWT token
            var email = user.FindFirst(ClaimTypes.Email)?
                .Value?
                .Trim()
                .ToLower();

            if (string.IsNullOrWhiteSpace(email))
                return null;

            // 2. Find logged-in employee
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Email != null &&
                    x.Email.ToLower() == email);

            if (employee == null)
                return null;

            string employeeId = employee.Employee_Id;

            int currentYear = DateTime.Today.Year;

            // 3. Get total allowed leaves
            var leaveSettings = await _context.LeaveSettings
                .AsNoTracking()
                .FirstOrDefaultAsync();

            int totalLeaves = leaveSettings?.MaxLeaveDays ?? 12;

            // 4. Get paid leaves used for current year
            var employeeBalances = await _context.EmployeeMonthlyLeaveBalances
                .AsNoTracking()
                .Where(x =>
                    x.Employee_Id == employeeId &&
                    x.LeaveYear == currentYear)
                .ToListAsync();

            int paidLeaves = employeeBalances.Sum(x => x.UsedLeaves);

            int usedLeaves = paidLeaves;

            int balanceLeaves = totalLeaves - usedLeaves;

            if (balanceLeaves < 0)
            {
                balanceLeaves = 0;
            }

            if (balanceLeaves < 0)
                balanceLeaves = 0;

            return new
            {
                EmployeeId = employee.Employee_Id,
                EmployeeName = employee.Name,

                TL = totalLeaves,
                UL = usedLeaves,
                BL = balanceLeaves
            };
        }
    }
}