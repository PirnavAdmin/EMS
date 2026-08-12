using EmployeeManagementSystem.Data;

using EmployeeManagementSystem.DTOs;

using EmployeeManagementSystem.Interfaces;

using EmployeeManagementSystem.Models;

using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services

{

    public class EmployeeShiftService : IEmployeeShiftService

    {

        private readonly AppDbContext _context;

        public EmployeeShiftService(AppDbContext context)

        {

            _context = context;

        }

        //vishnu change

        public async Task<string> AssignShiftAsync(AssignShiftDto dto)

        {

            // 1. Validate employee

            var employeeExists = await _context.Employees

                .AnyAsync(x => x.Employee_Id == dto.Employee_Id);

            if (!employeeExists)

                return "Employee not found.";

            // 2. Validate shift

            var shift = await _context.ShiftMasters

                .FirstOrDefaultAsync(x => x.ShiftId == dto.ShiftId);

            if (shift == null)

                return "Shift not found.";

            if (!shift.IsActive)

                return "Selected shift is inactive.";

            // 3. Validate effective date

            if (dto.EffectiveFrom == default)

                return "Effective From date is required.";

            if (dto.EffectiveTo.HasValue &&

                dto.EffectiveTo.Value.Date < dto.EffectiveFrom.Date)

            {

                return "Effective To date cannot be before Effective From date.";

            }

            // 4. Find current active assignment

            var currentAssignments = await _context.EmployeeShiftAssignments

                .Where(x =>

                    x.Employee_Id == dto.Employee_Id &&

                    x.IsActive)

                .ToListAsync();

            // 5. Close previous active assignments

            foreach (var item in currentAssignments)

            {

                item.IsActive = false;

                // Previous shift ends one day before new shift starts

                var previousEndDate = dto.EffectiveFrom.Date.AddDays(-1);

                // Don't create an invalid date

                item.EffectiveTo = previousEndDate;

                item.UpdatedDate = DateTime.Now;

            }

            // 6. Create new assignment

            var assignment = new EmployeeShiftAssignment

            {

                Employee_Id = dto.Employee_Id,

                ShiftId = dto.ShiftId,

                EffectiveFrom = dto.EffectiveFrom,

                EffectiveTo = dto.EffectiveTo,

                IsActive = true,

                CreatedDate = DateTime.Now

            };

            _context.EmployeeShiftAssignments.Add(assignment);

            await _context.SaveChangesAsync();

            return "Shift assigned successfully.";

        }

        // vishnu

        public async Task<string> BulkAssignShiftAsync(List<AssignShiftDto> dto)

        {

            if (dto == null || dto.Count == 0)

                return "No shift assignments provided.";

            var errors = new List<string>();

            foreach (var item in dto)

            {

                var result = await AssignShiftAsync(item);

                if (result != "Shift assigned successfully.")

                {

                    errors.Add($"{item.Employee_Id}: {result}");

                }

            }

            if (errors.Count > 0)

            {

                return "Bulk assignment completed with errors: " +

                       string.Join(" | ", errors);

            }

            return "Bulk shift assignment completed.";

        }

        //

        public async Task<IEnumerable<EmployeeShiftResponseDto>> GetAllAssignmentsAsync()

        {

            return await _context.EmployeeShiftAssignments

                .Include(x => x.Shift)

                .Where(x => x.IsActive)

                .Select(x => new EmployeeShiftResponseDto

                {

                    AssignmentId = x.AssignmentId,

                    Employee_Id = x.Employee_Id,

                    ShiftId = x.ShiftId,

                    ShiftName = x.Shift!.ShiftName,

                    ShiftCode = x.Shift.ShiftCode,

                    StartTime = x.Shift.StartTime,

                    EndTime = x.Shift.EndTime,

                    EffectiveFrom = x.EffectiveFrom,

                    EffectiveTo = x.EffectiveTo,

                    IsActive = x.IsActive

                })

                .ToListAsync();

        }

        public async Task<EmployeeShiftResponseDto?> GetEmployeeShiftAsync(string employeeId)

        {

            return await _context.EmployeeShiftAssignments

                .Include(x => x.Shift)

                .Where(x => x.Employee_Id == employeeId && x.IsActive)

                .Select(x => new EmployeeShiftResponseDto

                {

                    AssignmentId = x.AssignmentId,

                    Employee_Id = x.Employee_Id,

                    ShiftId = x.ShiftId,

                    ShiftName = x.Shift!.ShiftName,

                    ShiftCode = x.Shift.ShiftCode,

                    StartTime = x.Shift.StartTime,

                    EndTime = x.Shift.EndTime,

                    EffectiveFrom = x.EffectiveFrom,

                    EffectiveTo = x.EffectiveTo,

                    IsActive = x.IsActive

                })

                .FirstOrDefaultAsync();

        }

        public async Task<string> RemoveAssignmentAsync(int assignmentId)

        {

            var assignment = await _context.EmployeeShiftAssignments

                .FirstOrDefaultAsync(x => x.AssignmentId == assignmentId);

            if (assignment == null)

                return "Assignment not found.";

            assignment.IsActive = false;

            assignment.UpdatedDate = DateTime.Now;

            await _context.SaveChangesAsync();

            return "Assignment removed successfully.";

        }

    }

}
