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

        // =========================================================================
        // 1. ASSIGN SHIFT TO EMPLOYEE (OR RE-ASSIGN UNASSIGNED EMPLOYEE)
        // =========================================================================
        public async Task<string> AssignShiftAsync(AssignShiftDto dto)
        {
            var empId = dto.Employee_Id?.Trim() ?? "";

            // 1. Validate employee
            var employeeExists = await _context.Employees
                .AnyAsync(x => x.Employee_Id == empId);

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

            // 4. Find and close any current active assignments
            var currentAssignments = await _context.EmployeeShiftAssignments
                .Where(x => x.Employee_Id == empId && x.IsActive)
                .ToListAsync();

            foreach (var item in currentAssignments)
            {
                item.IsActive = false;
                item.EffectiveTo = dto.EffectiveFrom.Date.AddDays(-1);
                item.UpdatedDate = DateTime.Now;
            }

            // 5. Create new active assignment
            var assignment = new EmployeeShiftAssignment
            {
                Employee_Id = empId,
                ShiftId = dto.ShiftId,
                EffectiveFrom = dto.EffectiveFrom,
                EffectiveTo = dto.EffectiveTo,
                IsActive = true,
                CreatedDate = DateTime.Now
            };

            _context.EmployeeShiftAssignments.Add(assignment);

            // 6. Sync TeamMemberOverride if employee is in a team so shift reflects everywhere immediately
            var teamMember = await _context.TeamMembers.FirstOrDefaultAsync(tm => tm.EmployeeId == empId);
            if (teamMember != null)
            {
                var tmo = await _context.TeamMemberOverrides.FirstOrDefaultAsync(o => o.TeamMemberId == teamMember.Id);
                if (tmo != null)
                {
                    tmo.OverrideShiftId = dto.ShiftId;
                    tmo.CustomShift = true;
                }
                else
                {
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = teamMember.Id,
                        OverrideShiftId = dto.ShiftId,
                        CustomShift = true
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Clear attendance shift cache for this employee so new shift applies immediately
            AttendanceService.ClearShiftCache(empId);

            return "Shift assigned successfully.";
        }

        // =========================================================================
        // 2. BULK ASSIGN SHIFTS
        // =========================================================================
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
                return "Bulk assignment completed with errors: " + string.Join(" | ", errors);
            }

            return "Bulk shift assignment completed.";
        }

        // =========================================================================
        // 3. GET ALL ACTIVE EMPLOYEE SHIFTS (WITH AUTO-PERSISTED ASSIGNMENT IDs)
        // =========================================================================
        public async Task<IEnumerable<EmployeeShiftResponseDto>> GetAllAssignmentsAsync()
        {
            var today = DateTime.Today;

            // 1. Fetch all active employees
            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => e.Status == null ||
                            e.Status == "" ||
                            e.Status.ToLower() == "active" ||
                            e.Status.ToLower() == "joined" ||
                            e.Status.ToLower() != "inactive")
                .ToListAsync();

            if (!employees.Any())
            {
                employees = await _context.Employees.AsNoTracking().ToListAsync();
            }

            if (!employees.Any())
                return Enumerable.Empty<EmployeeShiftResponseDto>();

            // 2. Fetch all shifts
            var allShifts = await _context.ShiftMasters
                .AsNoTracking()
                .Where(s => s.IsActive)
                .ToListAsync();

            if (!allShifts.Any())
            {
                allShifts = await _context.ShiftMasters.AsNoTracking().ToListAsync();
            }

            if (!allShifts.Any())
                return Enumerable.Empty<EmployeeShiftResponseDto>();

            // 3. Fetch all direct assignments from DB
            var allDirectAssignments = await _context.EmployeeShiftAssignments
                .Where(x => x.EffectiveFrom.Date <= today)
                .ToListAsync();

            // 4. Fetch daily rosters for today
            var todayRosters = await _context.ShiftRosters
                .AsNoTracking()
                .Where(r => r.RosterDate.Date == today && r.IsPublished)
                .ToListAsync();

            // 5. Fetch team memberships
            var teamMembers = await _context.TeamMembers
                .AsNoTracking()
                .Include(tm => tm.Team)
                .Include(tm => tm.TeamMemberOverride)
                .Where(tm => tm.Team != null && tm.Team.IsActive)
                .ToListAsync();

            var result = new List<EmployeeShiftResponseDto>();
            var newAssignmentsToSave = new List<EmployeeShiftAssignment>();

            foreach (var emp in employees)
            {
                var empId = emp.Employee_Id?.Trim() ?? "";

                // Get all direct assignments for this employee
                var empDirectList = allDirectAssignments
                    .Where(a => string.Equals(a.Employee_Id?.Trim(), empId, StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(a => a.EffectiveFrom)
                    .ThenByDescending(a => a.AssignmentId)
                    .ToList();

                var activeDirect = empDirectList.FirstOrDefault(a => a.IsActive &&
                    (a.EffectiveTo == null || a.EffectiveTo.Value.Date >= today));

                var latestAssignment = empDirectList.FirstOrDefault();

                // If explicitly unassigned, respect the unassignment and do not force a fallback
                if (activeDirect == null && latestAssignment != null && !latestAssignment.IsActive)
                {
                    continue;
                }

                ShiftMaster? effectiveShift = null;
                int assignmentId = 0;
                string assignmentType = "Direct";
                DateTime effectiveFrom = emp.JoiningDate == default ? today : emp.JoiningDate;
                DateTime? effectiveTo = null;

                // Priority 1: Direct Active Assignment
                if (activeDirect != null)
                {
                    effectiveShift = allShifts.FirstOrDefault(s => s.ShiftId == activeDirect.ShiftId);
                    if (effectiveShift != null)
                    {
                        assignmentId = activeDirect.AssignmentId;
                        assignmentType = "Direct";
                        effectiveFrom = activeDirect.EffectiveFrom;
                        effectiveTo = activeDirect.EffectiveTo;
                    }
                }

                // Priority 2: Daily Shift Roster
                if (effectiveShift == null)
                {
                    var roster = todayRosters.FirstOrDefault(r =>
                        string.Equals(r.Employee_Id?.Trim(), empId, StringComparison.OrdinalIgnoreCase));
                    if (roster != null)
                    {
                        effectiveShift = allShifts.FirstOrDefault(s => s.ShiftId == roster.ShiftId);
                        if (effectiveShift != null)
                        {
                            assignmentType = "Roster";
                            effectiveFrom = roster.RosterDate;
                            effectiveTo = roster.RosterDate;
                        }
                    }
                }

                // Priority 3: Team Member Custom Override
                if (effectiveShift == null)
                {
                    var empTeams = teamMembers
                        .Where(tm => string.Equals(tm.EmployeeId?.Trim(), empId, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    var overrideMember = empTeams.FirstOrDefault(tm =>
                        tm.TeamMemberOverride != null &&
                        tm.TeamMemberOverride.CustomShift &&
                        tm.TeamMemberOverride.OverrideShiftId.HasValue);

                    if (overrideMember?.TeamMemberOverride?.OverrideShiftId != null)
                    {
                        effectiveShift = allShifts.FirstOrDefault(s => s.ShiftId == overrideMember.TeamMemberOverride.OverrideShiftId.Value);
                        if (effectiveShift != null)
                        {
                            assignmentType = "TeamOverride";
                        }
                    }
                    else if (empTeams.Any())
                    {
                        // Priority 4: Team Base Shift
                        var teamWithShift = empTeams.FirstOrDefault(tm => tm.Team?.ShiftId != null);
                        if (teamWithShift?.Team?.ShiftId != null)
                        {
                            effectiveShift = allShifts.FirstOrDefault(s => s.ShiftId == teamWithShift.Team.ShiftId.Value);
                            if (effectiveShift != null)
                            {
                                assignmentType = "Team";
                            }
                        }
                    }
                }

                if (effectiveShift != null)
                {
                    result.Add(new EmployeeShiftResponseDto
                    {
                        AssignmentId = assignmentId,
                        Employee_Id = emp.Employee_Id,
                        ShiftId = effectiveShift.ShiftId,
                        ShiftName = effectiveShift.ShiftName,
                        ShiftCode = effectiveShift.ShiftCode ?? "",
                        StartTime = effectiveShift.StartTime,
                        EndTime = effectiveShift.EndTime,
                        EffectiveFrom = effectiveFrom,
                        EffectiveTo = effectiveTo,
                        IsActive = true,
                        AssignmentType = assignmentType,
                        CanUnassign = true
                    });
                }
            }

            return result.OrderBy(x => x.Employee_Id);
        }

        // =========================================================================
        // 4. GET SINGLE EMPLOYEE SHIFT BY EMPLOYEE ID
        // =========================================================================
        public async Task<EmployeeShiftResponseDto?> GetEmployeeShiftAsync(string employeeId)
        {
            var all = await GetAllAssignmentsAsync();
            return all.FirstOrDefault(x => string.Equals(x.Employee_Id?.Trim(), employeeId?.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        // =========================================================================
        // 5. REMOVE / UNASSIGN BY ASSIGNMENT ID
        // =========================================================================
        public async Task<string> RemoveAssignmentAsync(int assignmentId)
        {
            if (assignmentId <= 0)
                return "Invalid assignment ID.";

            var assignment = await _context.EmployeeShiftAssignments
                .FirstOrDefaultAsync(x => x.AssignmentId == assignmentId);

            if (assignment == null)
                return "Assignment not found.";

            var empId = assignment.Employee_Id;

            assignment.IsActive = false;
            assignment.EffectiveTo = DateTime.Now;
            assignment.UpdatedDate = DateTime.Now;

            // Sync TeamMemberOverride if in a team
            if (!string.IsNullOrWhiteSpace(empId))
            {
                var teamMember = await _context.TeamMembers.FirstOrDefaultAsync(tm => tm.EmployeeId == empId);
                if (teamMember != null)
                {
                    var tmo = await _context.TeamMemberOverrides.FirstOrDefaultAsync(o => o.TeamMemberId == teamMember.Id);
                    if (tmo != null)
                    {
                        tmo.OverrideShiftId = null;
                        tmo.CustomShift = true;
                    }
                    else
                    {
                        _context.TeamMemberOverrides.Add(new TeamMemberOverride
                        {
                            TeamMemberId = teamMember.Id,
                            OverrideShiftId = null,
                            CustomShift = true
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            // Clear attendance shift cache for this employee so attendance reflects the unassigned shift immediately
            if (!string.IsNullOrWhiteSpace(empId))
            {
                AttendanceService.ClearShiftCache(empId);
            }

            return "Assignment removed successfully.";
        }

        // =========================================================================
        // 6. UNASSIGN SHIFT BY EMPLOYEE ID
        // =========================================================================
        public async Task<string> UnassignShiftAsync(string employeeId)
        {
            var empId = employeeId?.Trim() ?? "";

            // 1. Validate employee
            var employeeExists = await _context.Employees
                .AnyAsync(x => x.Employee_Id == empId);

            if (!employeeExists)
                return "Employee not found.";

            // 2. Find active assignments
            var activeAssignments = await _context.EmployeeShiftAssignments
                .Where(x => x.Employee_Id == empId && x.IsActive)
                .ToListAsync();

            // Deactivate all active assignments
            foreach (var item in activeAssignments)
            {
                item.IsActive = false;
                item.EffectiveTo = DateTime.Now;
                item.UpdatedDate = DateTime.Now;
            }

            if (!activeAssignments.Any())
            {
                // Create an explicit unassigned record to ensure no fallback re-attaches
                _context.EmployeeShiftAssignments.Add(new EmployeeShiftAssignment
                {
                    Employee_Id = empId,
                    ShiftId = 1,
                    EffectiveFrom = DateTime.Today,
                    EffectiveTo = DateTime.Now,
                    IsActive = false,
                    CreatedDate = DateTime.Now,
                    UpdatedDate = DateTime.Now
                });
            }

            // Sync TeamMemberOverride if in a team
            var teamMember = await _context.TeamMembers.FirstOrDefaultAsync(tm => tm.EmployeeId == empId);
            if (teamMember != null)
            {
                var tmo = await _context.TeamMemberOverrides.FirstOrDefaultAsync(o => o.TeamMemberId == teamMember.Id);
                if (tmo != null)
                {
                    tmo.OverrideShiftId = null;
                    tmo.CustomShift = true;
                }
                else
                {
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = teamMember.Id,
                        OverrideShiftId = null,
                        CustomShift = true
                    });
                }
            }

            await _context.SaveChangesAsync();

            // Clear attendance shift cache for this employee so attendance reflects the unassigned shift immediately
            AttendanceService.ClearShiftCache(empId);

            return "Shift unassigned from employee successfully.";
        }
    }
}
