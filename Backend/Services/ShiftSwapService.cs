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

        #region Helper Status Checkers

        private static bool IsPendingEmployeeApproval(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim();
            return s.Equals("PendingEmployeeApproval", StringComparison.OrdinalIgnoreCase) ||
                   s.Equals("Pending", StringComparison.OrdinalIgnoreCase) ||
                   s.StartsWith("Pending at", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsPendingAdminApproval(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim();
            return s.Equals("PendingAdminApproval", StringComparison.OrdinalIgnoreCase) ||
                   s.StartsWith("Waiting", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsApproved(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim();
            return s.StartsWith("Approved", StringComparison.OrdinalIgnoreCase) ||
                   s.StartsWith("Accepted", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsRejected(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            var s = status.Trim();
            return s.StartsWith("Rejected", StringComparison.OrdinalIgnoreCase);
        }

        #endregion

        public async Task<IEnumerable<ShiftSwapResponseDto>> GetAllAsync(
            string? employeeId = null,
            string? type = null,
            string? status = null,
            bool? forAdmin = null,
            string? role = null,
            bool includePendingEmployee = false)
        {
            // Resolve employeeId if provided (or extracted from claims)
            string? resolvedEmpId = null;
            if (!string.IsNullOrWhiteSpace(employeeId))
            {
                resolvedEmpId = await ResolveEmployeeIdAsync(employeeId) ?? employeeId.Trim();
            }

            bool isAdminView = forAdmin == true ||
                               string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(role, "manager", StringComparison.OrdinalIgnoreCase) ||
                               (string.IsNullOrWhiteSpace(resolvedEmpId) && !includePendingEmployee);

            var today = DateTime.Today;
            // Auto-expire past pending / waiting shift swaps
            var expiredSwaps = await _context.ShiftSwaps
                .Where(x => (x.Status.StartsWith("Pending") || x.Status.StartsWith("Waiting")) && x.ShiftDate.Date < today)
                .ToListAsync();
            if (expiredSwaps.Any())
            {
                foreach (var item in expiredSwaps)
                {
                    item.Status = "Expired";
                }
                await _context.SaveChangesAsync();
            }

            var query = _context.ShiftSwaps.AsQueryable();

            if (!string.IsNullOrWhiteSpace(resolvedEmpId) && !isAdminView)
            {
                if (string.Equals(type, "sent", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(type, "outgoing", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(x => x.FromEmployeeId == resolvedEmpId);
                }
                else if (string.Equals(type, "received", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "incoming", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(type, "inbox", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(x => x.ToEmployeeId == resolvedEmpId);
                }
                else
                {
                    query = query.Where(x => x.FromEmployeeId == resolvedEmpId || x.ToEmployeeId == resolvedEmpId);
                }
            }
            else if (isAdminView)
            {
                // ADMIN / MANAGER:
                // Show ALL shift swap requests.
                // Do not filter by employee ID or workflow status here.
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var s = status.Trim().ToLower();
                if (s == "pending" || s == "waiting")
                {
                    if (isAdminView)
                    {
                        // In Admin view, "pending" means requests waiting for Admin/Manager approval
                        query = query.Where(x => x.Status.ToLower() == "pendingadminapproval" || x.Status.ToLower().StartsWith("waiting"));
                    }
                    else
                    {
                        query = query.Where(x => x.Status.ToLower() == "pendingemployeeapproval" ||
                                                 x.Status.ToLower().StartsWith("pending at") ||
                                                 x.Status.ToLower() == "pending" ||
                                                 x.Status.ToLower() == "pendingadminapproval" ||
                                                 x.Status.ToLower().StartsWith("waiting"));
                    }
                }
                else if (s == "pendingemployee" || s == "pendingemployeeapproval")
                {
                    query = query.Where(x => x.Status.ToLower() == "pendingemployeeapproval" ||
                                             x.Status.ToLower().StartsWith("pending at") ||
                                             x.Status.ToLower() == "pending");
                }
                else if (s == "pendingadmin" || s == "pendingadminapproval")
                {
                    query = query.Where(x => x.Status.ToLower() == "pendingadminapproval" || x.Status.ToLower().StartsWith("waiting"));
                }
                else if (s == "approved" || s == "accepted")
                {
                    query = query.Where(x => x.Status.ToLower().StartsWith("approved") || x.Status.ToLower().StartsWith("accepted"));
                }
                else if (s == "rejected")
                {
                    query = query.Where(x => x.Status.ToLower().StartsWith("rejected"));
                }
                else
                {
                    query = query.Where(x => x.Status.ToLower() == s || x.Status.ToLower().Contains(s));
                }
            }

            var list = await query
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            var empIds = list.Select(x => x.FromEmployeeId).Concat(list.Select(x => x.ToEmployeeId)).Distinct().ToList();
            var employees = await _context.Employees
                .Where(e => empIds.Contains(e.Employee_Id))
                .ToDictionaryAsync(e => e.Employee_Id, e => e.Name);


            var shifts = await _context.ShiftMasters
                .ToDictionaryAsync(s => s.ShiftId, s => s.ShiftName);

            var resultList = new List<ShiftSwapResponseDto>();
            foreach (var x in list)
            {
                employees.TryGetValue(x.FromEmployeeId, out var fromName);
                employees.TryGetValue(x.ToEmployeeId, out var toName);
                shifts.TryGetValue(x.ShiftId, out var shiftName);

                int toShiftId = await GetEffectiveShiftIdAsync(x.ToEmployeeId, x.ShiftDate);
                shifts.TryGetValue(toShiftId, out var toShiftName);

                resultList.Add(new ShiftSwapResponseDto
                {
                    SwapId = x.SwapId,
                    FromEmployeeId = x.FromEmployeeId,
                    FromEmployeeName = fromName ?? x.FromEmployeeId,
                    ToEmployeeId = x.ToEmployeeId,
                    ToEmployeeName = toName ?? x.ToEmployeeId,
                    ShiftDate = x.ShiftDate,
                    ShiftId = x.ShiftId,
                    ShiftName = shiftName ?? x.ShiftId.ToString(),
                    ToShiftId = toShiftId,
                    ToShiftName = toShiftName ?? toShiftId.ToString(),
                    Reason = x.Reason,
                    Status = x.Status,
                    ApprovedBy = x.ApprovedBy,
                    ApprovedDate = x.ApprovedDate,
                    CreatedDate = x.CreatedDate
                });
            }

            return resultList;
        }

        public async Task<ShiftSwapResponseDto?> GetByIdAsync(int id)
        {
            var swap = await _context.ShiftSwaps.FindAsync(id);
            if (swap == null) return null;

            var fromEmp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == swap.FromEmployeeId);
            var toEmp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == swap.ToEmployeeId);
            var shift = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(s => s.ShiftId == swap.ShiftId);

            int toShiftId = await GetEffectiveShiftIdAsync(swap.ToEmployeeId, swap.ShiftDate);
            var toShift = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(s => s.ShiftId == toShiftId);

            return new ShiftSwapResponseDto
            {
                SwapId = swap.SwapId,
                FromEmployeeId = swap.FromEmployeeId,
                FromEmployeeName = fromEmp?.Name ?? swap.FromEmployeeId,
                ToEmployeeId = swap.ToEmployeeId,
                ToEmployeeName = toEmp?.Name ?? swap.ToEmployeeId,
                ShiftDate = swap.ShiftDate,
                ShiftId = swap.ShiftId,
                ShiftName = shift?.ShiftName ?? swap.ShiftId.ToString(),
                ToShiftId = toShiftId,
                ToShiftName = toShift?.ShiftName ?? toShiftId.ToString(),
                Reason = swap.Reason,
                Status = swap.Status,
                ApprovedBy = swap.ApprovedBy,
                ApprovedDate = swap.ApprovedDate,
                CreatedDate = swap.CreatedDate
            };
        }

        public async Task<bool> RequestSwapAsync(CreateShiftSwapDto dto)
        {
            var result = await RequestSwapDetailedAsync(dto);
            return result.Success;
        }

        private async Task<string?> ResolveEmployeeIdAsync(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            var trimmed = input.Trim();

            // 1. Check direct match on Employee_Id (e.g. "P464", "P497")
            var emp = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Employee_Id == trimmed);
            if (emp != null) return emp.Employee_Id;

            // 2. Check case-insensitive match
            var empCi = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Employee_Id.ToLower() == trimmed.ToLower());
            if (empCi != null) return empCi.Employee_Id;

            // 3. If numeric, check integer primary keys in Employees.Id or TeamMembers.Id
            if (int.TryParse(trimmed, out int numericId))
            {
                var empById = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == numericId);
                if (empById != null) return empById.Employee_Id;

                var teamMember = await _context.TeamMembers
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == numericId);
                if (teamMember != null) return teamMember.EmployeeId;
            }

            // 4. Check email match
            var empByEmail = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Email != null && x.Email.ToLower() == trimmed.ToLower());
            if (empByEmail != null) return empByEmail.Employee_Id;

            return null;
        }
        private async Task<(bool IsValid, string Message)>
    ValidateTeamAndTechnologyCompatibilityAsync(
        string fromEmployeeId,
        string toEmployeeId)
        {
            // ============================================================
            // 1. Validate employee IDs
            // ============================================================

            if (string.IsNullOrWhiteSpace(fromEmployeeId))
            {
                return (
                    false,
                    "Requesting employee could not be identified."
                );
            }

            if (string.IsNullOrWhiteSpace(toEmployeeId))
            {
                return (
                    false,
                    "Target employee could not be identified."
                );
            }

            // ============================================================
            // 2. Get Employee A's active team
            // ============================================================

            var fromTeamMember = await _context.TeamMembers
                .Include(tm => tm.Team)
                .AsNoTracking()
                .FirstOrDefaultAsync(tm =>
                    tm.EmployeeId == fromEmployeeId &&
                    tm.Team != null &&
                    tm.Team.IsActive);

            if (fromTeamMember?.Team == null)
            {
                return (
                    false,
                    $"Employee {fromEmployeeId} is not assigned to an active team."
                );
            }

            // ============================================================
            // 3. Get Employee B's active team
            // ============================================================

            var toTeamMember = await _context.TeamMembers
                .Include(tm => tm.Team)
                .AsNoTracking()
                .FirstOrDefaultAsync(tm =>
                    tm.EmployeeId == toEmployeeId &&
                    tm.Team != null &&
                    tm.Team.IsActive);

            if (toTeamMember?.Team == null)
            {
                return (
                    false,
                    $"Employee {toEmployeeId} is not assigned to an active team."
                );
            }

            var fromTeam = fromTeamMember.Team;
            var toTeam = toTeamMember.Team;

            // ============================================================
            // 4. SAME TEAM VALIDATION
            // ============================================================

            if (fromTeam.Id != toTeam.Id)
            {
                return (
                    false,
                    $" {fromEmployeeId} and {toEmployeeId} belong to different teams."
                );
            }

            // ============================================================
            // 5. Validate project
            // ============================================================

            // ProjectId is an int in the Team model, so do not use
            // HasValue or Value.

            if (fromTeam.ProjectId <= 0)
            {
                return (
                    false,
                    $"Team '{fromTeam.TeamName}' is not associated with a valid project."
                );
            }

            if (toTeam.ProjectId <= 0)
            {
                return (
                    false,
                    $"Team '{toTeam.TeamName}' is not associated with a valid project."
                );
            }

            // Same team should belong to the same project.
            if (fromTeam.ProjectId != toTeam.ProjectId)
            {
                return (
                    false,
                    "Employee's Team Mismatch."
                );
            }

            int projectId = fromTeam.ProjectId.Value;

            // ============================================================
            // 6. Get Employee A technology
            // ============================================================

            var fromProjectTeamMember = await _context.ProjectTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(ptm =>
                    ptm.EmployeeId == fromEmployeeId &&
                    ptm.ProjectId == projectId);

            if (fromProjectTeamMember == null ||
                string.IsNullOrWhiteSpace(fromProjectTeamMember.Technology))
            {
                return (
                    false,
                    $"Technology is not assigned to employee {fromEmployeeId}."
                );
            }

            // ============================================================
            // 7. Get Employee B technology
            // ============================================================

            var toProjectTeamMember = await _context.ProjectTeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(ptm =>
                    ptm.EmployeeId == toEmployeeId &&
                    ptm.ProjectId == projectId);

            if (toProjectTeamMember == null ||
                string.IsNullOrWhiteSpace(toProjectTeamMember.Technology))
            {
                return (
                    false,
                    $"Technology is not assigned to employee {toEmployeeId}."
                );
            }

            string fromTechnology =
                fromProjectTeamMember.Technology.Trim();

            string toTechnology =
                toProjectTeamMember.Technology.Trim();

            // ============================================================
            // 8. Normalize technology names
            // ============================================================

            string normalizedFromTechnology = fromTechnology
                .Replace(" ", "")
                .Replace("-", "")
                .Replace("_", "")
                .Trim()
                .ToLowerInvariant();

            string normalizedToTechnology = toTechnology
                .Replace(" ", "")
                .Replace("-", "")
                .Replace("_", "")
                .Trim()
                .ToLowerInvariant();

            // ============================================================
            // 9. SAME TECHNOLOGY = ALLOWED
            // ============================================================

            if (normalizedFromTechnology ==
                normalizedToTechnology)
            {
                return (
                    true,
                    "Shift swap is allowed."
                );
            }

            // ============================================================
            // 10. FULL STACK COMPATIBILITY
            // ============================================================

            bool fromIsFullStack =
                normalizedFromTechnology == "fullstack";

            bool toIsFullStack =
                normalizedToTechnology == "fullstack";

            bool fromIsFrontend =
                normalizedFromTechnology == "frontend";

            bool toIsFrontend =
                normalizedToTechnology == "frontend";

            bool fromIsBackend =
                normalizedFromTechnology == "backend";

            bool toIsBackend =
                normalizedToTechnology == "backend";

            // Full Stack <-> Frontend
            if ((fromIsFullStack && toIsFrontend) ||
                (fromIsFrontend && toIsFullStack))
            {
                return (
                    true,
                    "Shift swap is allowed."
                );
            }

            // Full Stack <-> Backend
            if ((fromIsFullStack && toIsBackend) ||
                (fromIsBackend && toIsFullStack))
            {
                return (
                    true,
                    "Shift swap is allowed."
                );
            }

            // ============================================================
            // 11. ALL OTHER COMBINATIONS = NOT ALLOWED
            // ============================================================

            return (
                false,

                "Employees must have the same technology "
            );
        }
        private async Task<int> GetEffectiveShiftIdAsync(string employeeId, DateTime date)
        {
            if (string.IsNullOrWhiteSpace(employeeId)) return 1;

            // 1. Check ShiftRoster for this specific date
            var roster = await _context.ShiftRosters
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId && x.RosterDate.Date == date.Date);
            if (roster != null && roster.ShiftId > 0)
                return roster.ShiftId;

            // 2. Check TeamMemberOverride (if member has CustomShift set)
            var member = await _context.TeamMembers
                .Include(m => m.TeamMemberOverride)
                .Include(m => m.Team)
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.EmployeeId == employeeId);

            if (member?.TeamMemberOverride != null &&
                member.TeamMemberOverride.CustomShift &&
                member.TeamMemberOverride.OverrideShiftId.HasValue &&
                member.TeamMemberOverride.OverrideShiftId.Value > 0)
            {
                return member.TeamMemberOverride.OverrideShiftId.Value;
            }

            // 3. Check EmployeeShiftAssignment (Active assignment)
            var assignment = await _context.EmployeeShiftAssignments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Employee_Id == employeeId && x.IsActive);
            if (assignment != null && assignment.ShiftId > 0)
                return assignment.ShiftId;

            // 4. Team's default shift
            if (member?.Team?.ShiftId.HasValue == true && member.Team.ShiftId.Value > 0)
                return member.Team.ShiftId.Value;

            // 5. Default active shift from ShiftMasters
            var defaultShift = await _context.ShiftMasters
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.IsActive);
            return defaultShift?.ShiftId ?? 1;
        }

        public async Task<(bool Success, string Message)> RequestSwapDetailedAsync(
       CreateShiftSwapDto dto,
       string? loggedInUser = null)
        {
            if (dto == null)
                return (false, "Request payload cannot be empty.");

            // ============================================================
            // 1. REQUESTING EMPLOYEE MUST COME FROM JWT
            // ============================================================

            if (string.IsNullOrWhiteSpace(loggedInUser))
            {
                return (
                    false,
                    "Unable to identify the requesting employee from JWT token."
                );
            }

            var fromId = await ResolveEmployeeIdAsync(loggedInUser);

            if (string.IsNullOrWhiteSpace(fromId))
            {
                return (
                    false,
                    "Unable to identify the requesting employee from JWT token."
                );
            }

            // ============================================================
            // 2. TARGET EMPLOYEE COMES FROM REQUEST BODY
            // ============================================================

            string? rawTo = dto.ToEmployeeId
                ?? dto.ToEmployee_Id
                ?? dto.ToEmployee
                ?? dto.WithEmployeeId
                ?? dto.SwapWithEmployeeId
                ?? dto.SwapWith
                ?? dto.SwapTo
                ?? dto.SwapToEmployeeId
                ?? dto.TargetEmployeeId
                ?? dto.TargetId
                ?? dto.ReceiverId
                ?? dto.RequestedEmployeeId
                ?? dto.ToId;

            var toId = await ResolveEmployeeIdAsync(rawTo);

            if (string.IsNullOrWhiteSpace(toId))
            {
                return (
                    false,
                    "Unable to identify the target employee to swap with."
                );
            }

            if (string.Equals(
                fromId,
                toId,
                StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "You cannot swap shifts with the same employee."
                );
            }

            // ============================================================
            // TEAM + TECHNOLOGY VALIDATION
            // ============================================================

            var compatibility =
                await ValidateTeamAndTechnologyCompatibilityAsync(
                    fromId,
                    toId);

            if (!compatibility.IsValid)
            {
                return (
                    false,
                    compatibility.Message
                );
            }

            // Continue with your existing code from
            // "Resolve Date"
            // ...

            // Resolve Date
            var shiftDate = (dto.ShiftDate ?? dto.Date ?? dto.SwapDate ?? dto.ForDate ?? dto.FromDate ?? dto.EffectiveFrom ?? dto.TargetDate ?? DateTime.Today).Date;

            // DATE VALIDATION: Must be today or future date
            var today = DateTime.Today;
            if (shiftDate < today)
            {
                return (false, $"Shift swap date cannot be in the past ({shiftDate:yyyy-MM-dd}). Please select today ({today:yyyy-MM-dd}) or a future date.");
            }

            // Resolve Shift ID of requesting employee
            int shiftId = dto.ShiftId ?? dto.FromShiftId ?? dto.CurrentShiftId ?? 0;
            if (shiftId <= 0)
            {
                shiftId = await GetEffectiveShiftIdAsync(fromId, shiftDate);
            }

            var shiftExists = await _context.ShiftMasters.AnyAsync(x => x.ShiftId == shiftId && x.IsActive);
            if (!shiftExists)
                return (false, $"Active shift with ID {shiftId} was not found.");

            var exists = await _context.ShiftSwaps.AnyAsync(x =>
                ((x.FromEmployeeId == fromId && x.ToEmployeeId == toId) || (x.FromEmployeeId == toId && x.ToEmployeeId == fromId)) &&
                x.ShiftDate.Date == shiftDate &&
                (x.Status.StartsWith("Pending") || x.Status.StartsWith("Waiting")));

            if (exists)
                return (false, $"An active shift swap request already exists between {fromId} and {toId} for {shiftDate:yyyy-MM-dd}.");

            var emp1 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == fromId);
            var emp2 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == toId);

            string targetName = emp2?.Name ?? toId;
            string initialStatus = "PendingEmployeeApproval";

            var swap = new ShiftSwap
            {
                FromEmployeeId = fromId,
                ToEmployeeId = toId,
                ShiftDate = shiftDate,
                ShiftId = shiftId,
                Reason = dto.Reason ?? dto.Remarks ?? dto.Comments ?? "Shift swap requested",
                Status = initialStatus,
                CreatedDate = DateTime.Now
            };

            _context.ShiftSwaps.Add(swap);

            // Notify Target Employee (toId)
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = toId,
                Title = "New Shift Swap Request",
                Message = $"{emp1?.Name ?? fromId} ({fromId}) has requested to swap shifts with you on {shiftDate:dd MMM yyyy}. Please accept or reject this request.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return (true, $"Shift swap request submitted and sent to {targetName} for acceptance.");
        }

        #region Employee Stage (Step 1)

        public async Task<bool> EmployeeAcceptSwapAsync(int id, string? employeeId = null)
        {
            var result = await EmployeeAcceptSwapDetailedAsync(id, employeeId);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> EmployeeAcceptSwapDetailedAsync(int id, string? employeeId = null)
        {
            var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
            if (swap == null)
                return (false, $"Shift swap request with ID {id} was not found.", null);

            // 1. Verify caller identity if employeeId is provided
            if (!string.IsNullOrWhiteSpace(employeeId))
            {
                var resolvedCallerId = await ResolveEmployeeIdAsync(employeeId);
                if (!string.IsNullOrWhiteSpace(resolvedCallerId) &&
                    !string.Equals(swap.ToEmployeeId, resolvedCallerId, StringComparison.OrdinalIgnoreCase))
                {
                    return (false, $"Unauthorized: Only the recipient employee ({swap.ToEmployeeId}) can accept this shift swap request.", swap.Status);
                }
            }

            // 2. Prevent invalid state transitions
            if (IsApproved(swap.Status))
                return (false, $"Shift swap request #{id} has already been approved (Current status: '{swap.Status}').", swap.Status);

            if (IsRejected(swap.Status))
                return (false, $"Shift swap request #{id} has already been rejected (Current status: '{swap.Status}').", swap.Status);

            if (IsPendingAdminApproval(swap.Status))
                return (false, $"Shift swap request #{id} has already been approved by Employee B and is currently awaiting Admin/Manager approval.", swap.Status);

            if (!IsPendingEmployeeApproval(swap.Status))
                return (false, $"Shift swap request #{id} cannot be accepted in its current status: '{swap.Status}'.", swap.Status);

            // Prevent accepting expired requests
            if (swap.ShiftDate.Date < DateTime.Today)
            {
                swap.Status = "Expired";
                await _context.SaveChangesAsync();
                return (false, $"Shift swap request #{id} has expired because the shift date ({swap.ShiftDate:yyyy-MM-dd}) has passed.", swap.Status);
            }

            // ============================================================
            // REVALIDATE TEAM + TECHNOLOGY
            // ============================================================

            var compatibility =
                await ValidateTeamAndTechnologyCompatibilityAsync(
                    swap.FromEmployeeId,
                    swap.ToEmployeeId);

            if (!compatibility.IsValid)
            {
                return (
                    false,
                    compatibility.Message,
                    swap.Status
                );
            }

            // 3. Update status to PendingAdminApproval (NO shift exchange at this step)
            swap.Status = "PendingAdminApproval";

            var emp1 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.FromEmployeeId);
            var emp2 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.ToEmployeeId);

            // 4. Notify Admin Dashboard of pending approval
            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "Shift Swap Request - Awaiting Approval",
                Message = $"{emp2?.Name ?? swap.ToEmployeeId} ({swap.ToEmployeeId}) accepted shift swap request from {emp1?.Name ?? swap.FromEmployeeId} ({swap.FromEmployeeId}) for {swap.ShiftDate:dd MMM yyyy}. Awaiting Admin/Manager final approval.",
                UserRole = "Employee",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                OrganizationId = emp1?.OrganizationId ?? emp2?.OrganizationId
            });

            // 5. Notify Requester (Employee A)
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = swap.FromEmployeeId,
                Title = "Shift Swap Accepted by Employee",
                Message = $"{emp2?.Name ?? swap.ToEmployeeId} accepted your shift swap request for {swap.ShiftDate:dd MMM yyyy}. It is now awaiting Admin/Manager approval.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return (true, "Shift swap accepted by employee. Request forwarded to Admin/Manager for final approval.", swap.Status);
        }

        public async Task<bool> EmployeeRejectSwapAsync(int id, string? remarks = null, string? employeeId = null)
        {
            var result = await EmployeeRejectSwapDetailedAsync(id, remarks, employeeId);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> EmployeeRejectSwapDetailedAsync(int id, string? remarks = null, string? employeeId = null)
        {
            var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
            if (swap == null)
                return (false, $"Shift swap request with ID {id} was not found.", null);

            // 1. Verify caller identity if employeeId is provided
            if (!string.IsNullOrWhiteSpace(employeeId))
            {
                var resolvedCallerId = await ResolveEmployeeIdAsync(employeeId);
                if (!string.IsNullOrWhiteSpace(resolvedCallerId) &&
                    !string.Equals(swap.ToEmployeeId, resolvedCallerId, StringComparison.OrdinalIgnoreCase))
                {
                    return (false, $"Unauthorized: Only the recipient employee ({swap.ToEmployeeId}) can reject this shift swap request.", swap.Status);
                }
            }

            // 2. Prevent invalid state transitions
            if (IsApproved(swap.Status))
                return (false, $"Shift swap request #{id} cannot be rejected because it has already been approved (Current status: '{swap.Status}').", swap.Status);

            if (IsRejected(swap.Status))
                return (false, $"Shift swap request #{id} is already rejected (Current status: '{swap.Status}').", swap.Status);

            if (IsPendingAdminApproval(swap.Status))
                return (false, $"Shift swap request #{id} has already been accepted by Employee B and is currently awaiting Admin approval.", swap.Status);

            if (!IsPendingEmployeeApproval(swap.Status))
                return (false, $"Shift swap request #{id} cannot be rejected by employee in '{swap.Status}' status.", swap.Status);

            var emp2 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.ToEmployeeId);
            string rejecterName = emp2?.Name ?? employeeId ?? swap.ToEmployeeId;

            swap.Status = $"Rejected by {rejecterName}";
            swap.ApprovedBy = rejecterName;
            swap.ApprovedDate = DateTime.Now;

            if (!string.IsNullOrWhiteSpace(remarks))
            {
                swap.Reason = string.IsNullOrWhiteSpace(swap.Reason)
                    ? $"Rejected by {rejecterName}: {remarks}"
                    : $"{swap.Reason} | Rejected by {rejecterName}: {remarks}";
            }
            else
            {
                swap.Reason = string.IsNullOrWhiteSpace(swap.Reason)
                    ? $"Rejected by {rejecterName}"
                    : $"{swap.Reason} | Rejected by {rejecterName}";
            }

            // Notify Requester (Employee A)
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = swap.FromEmployeeId,
                Title = "Shift Swap Declined",
                Message = $"{rejecterName} declined your shift swap request for {swap.ShiftDate:dd MMM yyyy}." + (!string.IsNullOrWhiteSpace(remarks) ? $" Remarks: {remarks}" : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return (true, $"Shift swap request declined by {rejecterName}.", swap.Status);
        }

        #endregion

        #region Admin Stage (Step 2)

        public async Task<bool> AdminApproveSwapAsync(int id, string? approvedBy = null)
        {
            var result = await AdminApproveSwapDetailedAsync(id, approvedBy);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> AdminApproveSwapDetailedAsync(int id, string? approvedBy = null)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
                if (swap == null)
                    return (false, $"Shift swap request with ID {id} was not found.", null);

                // 1. Prevent duplicate approval / exchange
                if (IsApproved(swap.Status))
                    return (false, $"Shift swap request #{id} has already been approved and processed (Current status: '{swap.Status}').", swap.Status);

                if (IsRejected(swap.Status))
                    return (false, $"Shift swap request #{id} cannot be approved because it has already been rejected (Current status: '{swap.Status}').", swap.Status);

                // 2. STRICT 2-STEP VALIDATION: Employee B must approve before Admin can approve
                if (IsPendingEmployeeApproval(swap.Status))
                {
                    var emp2 = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.ToEmployeeId);
                    string targetName = emp2?.Name ?? swap.ToEmployeeId;
                    return (false, $"Cannot approve this shift swap yet. It is currently pending acceptance from {targetName}. ", swap.Status);
                }

                // Prevent approving expired requests
                if (swap.ShiftDate.Date < DateTime.Today)
                {
                    swap.Status = "Expired";
                    await _context.SaveChangesAsync();
                    return (false, $"Shift swap request #{id} has expired because the shift date ({swap.ShiftDate:yyyy-MM-dd}) has passed.", swap.Status);
                }

                if (!IsPendingAdminApproval(swap.Status))
                {
                    return (false, $"Shift swap request #{id} cannot be approved in its current status: '{swap.Status}'.", swap.Status);
                }

                // Execute final approval and shift exchange inside an atomic database transaction
                await using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {

                    // ============================================================
                    // FINAL TEAM + TECHNOLOGY REVALIDATION
                    // ============================================================
                    // This is the final protection before the shift exchange.
                    // ============================================================

                    var compatibility =
                        await ValidateTeamAndTechnologyCompatibilityAsync(
                            swap.FromEmployeeId,
                            swap.ToEmployeeId);

                    if (!compatibility.IsValid)
                    {
                        return (
                            false,
                            compatibility.Message,
                            swap.Status
                        );
                    }

                    // 3. Resolve approver role
                    string approverRole = "Admin";
                    if (!string.IsNullOrWhiteSpace(approvedBy))
                    {
                        if (approvedBy.IndexOf("Manager", StringComparison.OrdinalIgnoreCase) >= 0)
                            approverRole = "Manager";
                        else if (approvedBy.IndexOf("Admin", StringComparison.OrdinalIgnoreCase) >= 0)
                            approverRole = "Admin";
                        else
                            approverRole = approvedBy;
                    }

                    swap.Status = $"Approved by {approverRole}";
                    swap.ApprovedBy = approvedBy ?? approverRole;
                    swap.ApprovedDate = DateTime.Now;

                    // 4. Resolve Employee A's current effective shift prior to swap
                    int emp1CurrentShiftId = await GetEffectiveShiftIdAsync(swap.FromEmployeeId, swap.ShiftDate);
                    if (emp1CurrentShiftId <= 0 && swap.ShiftId > 0)
                    {
                        emp1CurrentShiftId = swap.ShiftId;
                    }

                    // 5. Resolve Employee B's current effective shift prior to swap
                    int emp2CurrentShiftId = await GetEffectiveShiftIdAsync(swap.ToEmployeeId, swap.ShiftDate);

                    if (emp1CurrentShiftId == emp2CurrentShiftId && swap.ShiftId > 0 && swap.ShiftId != emp2CurrentShiftId)
                    {
                        emp1CurrentShiftId = swap.ShiftId;
                    }

                    // 6. Apply swapped shifts in ShiftRoster:
                    // Employee A (FromEmployee) gets Employee B's shift (emp2CurrentShiftId)
                    var emp1Roster = await _context.ShiftRosters
                        .FirstOrDefaultAsync(x => x.Employee_Id == swap.FromEmployeeId && x.RosterDate.Date == swap.ShiftDate.Date);

                    if (emp1Roster != null)
                    {
                        emp1Roster.ShiftId = emp2CurrentShiftId;
                        emp1Roster.UpdatedDate = DateTime.Now;
                        emp1Roster.UpdatedBy = swap.ApprovedBy;
                    }
                    else
                    {
                        _context.ShiftRosters.Add(new ShiftRoster
                        {
                            Employee_Id = swap.FromEmployeeId,
                            ShiftId = emp2CurrentShiftId,
                            RosterDate = swap.ShiftDate.Date,
                            Remarks = "Shift Swapped",
                            IsPublished = true,
                            CreatedBy = swap.ApprovedBy,
                            CreatedDate = DateTime.Now
                        });
                    }

                    // Employee B (ToEmployee) gets Employee A's shift (emp1CurrentShiftId)
                    var emp2Roster = await _context.ShiftRosters
                        .FirstOrDefaultAsync(x => x.Employee_Id == swap.ToEmployeeId && x.RosterDate.Date == swap.ShiftDate.Date);

                    if (emp2Roster != null)
                    {
                        emp2Roster.ShiftId = emp1CurrentShiftId;
                        emp2Roster.UpdatedDate = DateTime.Now;
                        emp2Roster.UpdatedBy = swap.ApprovedBy;
                    }
                    else
                    {
                        _context.ShiftRosters.Add(new ShiftRoster
                        {
                            Employee_Id = swap.ToEmployeeId,
                            ShiftId = emp1CurrentShiftId,
                            RosterDate = swap.ShiftDate.Date,
                            Remarks = "Shift Swapped",
                            IsPublished = true,
                            CreatedBy = swap.ApprovedBy,
                            CreatedDate = DateTime.Now
                        });
                    }

                    // 7. Update TeamMemberOverrides so the shift reflects immediately in Team views
                    var tm1 = await _context.TeamMembers.FirstOrDefaultAsync(x => x.EmployeeId == swap.FromEmployeeId);
                    if (tm1 != null)
                    {
                        var tmo1 = await _context.TeamMemberOverrides.FirstOrDefaultAsync(x => x.TeamMemberId == tm1.Id);
                        if (tmo1 != null)
                        {
                            tmo1.OverrideShiftId = emp2CurrentShiftId;
                            tmo1.CustomShift = true;
                        }
                        else
                        {
                            _context.TeamMemberOverrides.Add(new TeamMemberOverride
                            {
                                TeamMemberId = tm1.Id,
                                OverrideShiftId = emp2CurrentShiftId,
                                CustomShift = true
                            });
                        }
                    }

                    var tm2 = await _context.TeamMembers.FirstOrDefaultAsync(x => x.EmployeeId == swap.ToEmployeeId);
                    if (tm2 != null)
                    {
                        var tmo2 = await _context.TeamMemberOverrides.FirstOrDefaultAsync(x => x.TeamMemberId == tm2.Id);
                        if (tmo2 != null)
                        {
                            tmo2.OverrideShiftId = emp1CurrentShiftId;
                            tmo2.CustomShift = true;
                        }
                        else
                        {
                            _context.TeamMemberOverrides.Add(new TeamMemberOverride
                            {
                                TeamMemberId = tm2.Id,
                                OverrideShiftId = emp1CurrentShiftId,
                                CustomShift = true
                            });
                        }
                    }

                    // 8. Notify both employees of final approval and their new shift schedules
                    var emp1Obj = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.FromEmployeeId);
                    var emp2Obj = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Employee_Id == swap.ToEmployeeId);
                    var shift1 = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(x => x.ShiftId == emp2CurrentShiftId);
                    var shift2 = await _context.ShiftMasters.AsNoTracking().FirstOrDefaultAsync(x => x.ShiftId == emp1CurrentShiftId);

                    _context.UserNotifications.Add(new UserNotification
                    {
                        Employee_Id = swap.FromEmployeeId,
                        Title = "Shift Swap Approved",
                        Message = $"Your shift swap with {emp2Obj?.Name ?? swap.ToEmployeeId} ({swap.ToEmployeeId}) for {swap.ShiftDate:dd MMM yyyy} has been {swap.Status}. Your new shift is {shift1?.ShiftName ?? emp2CurrentShiftId.ToString()}.",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });

                    _context.UserNotifications.Add(new UserNotification
                    {
                        Employee_Id = swap.ToEmployeeId,
                        Title = "Shift Swap Approved",
                        Message = $"Shift swap with {emp1Obj?.Name ?? swap.FromEmployeeId} ({swap.FromEmployeeId}) for {swap.ShiftDate:dd MMM yyyy} has been {swap.Status}. Your new shift is {shift2?.ShiftName ?? emp1CurrentShiftId.ToString()}.",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });

                    // 9. Save all changes and commit atomic transaction
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return (true, $"Shift swap approved by {approverRole} and shifts swapped successfully.", swap.Status);
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return (false, $"An error occurred while approving the shift swap: {ex.Message}", null);
                }
            });
        }

        public async Task<bool> AdminRejectSwapAsync(int id, string? remarks = null, string? rejectedBy = null)
        {
            var result = await AdminRejectSwapDetailedAsync(id, remarks, rejectedBy);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> AdminRejectSwapDetailedAsync(int id, string? remarks = null, string? rejectedBy = null)
        {
            var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
            if (swap == null)
                return (false, $"Shift swap request with ID {id} was not found.", null);

            if (IsApproved(swap.Status))
                return (false, $"Shift swap request #{id} cannot be rejected because it is already approved (Current status: '{swap.Status}').", swap.Status);

            if (IsRejected(swap.Status))
                return (false, $"Shift swap request #{id} is already rejected (Current status: '{swap.Status}').", swap.Status);

            // STRICT 2-STEP WORKFLOW: Admin can reject only after Employee B has accepted
            if (!IsPendingAdminApproval(swap.Status))
            {
                return (false,
                    $"Shift swap request #{id} cannot be rejected by Admin because it is not awaiting Admin/Manager approval. Current status: '{swap.Status}'.",
                    swap.Status);
            }

            string rejecterRole = "Admin";
            if (!string.IsNullOrWhiteSpace(rejectedBy))
            {
                if (rejectedBy.IndexOf("Manager", StringComparison.OrdinalIgnoreCase) >= 0)
                    rejecterRole = "Manager";
                else if (rejectedBy.IndexOf("Admin", StringComparison.OrdinalIgnoreCase) >= 0)
                    rejecterRole = "Admin";
                else
                    rejecterRole = rejectedBy;
            }

            swap.Status = $"Rejected by {rejecterRole}";
            swap.ApprovedBy = rejectedBy ?? rejecterRole;
            swap.ApprovedDate = DateTime.Now;

            if (!string.IsNullOrWhiteSpace(remarks))
            {
                swap.Reason = string.IsNullOrWhiteSpace(swap.Reason)
                    ? $"Rejected by {rejecterRole}: {remarks}"
                    : $"{swap.Reason} | Rejected by {rejecterRole}: {remarks}";
            }

            // Notify both employees
            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = swap.FromEmployeeId,
                Title = "Shift Swap Rejected",
                Message = $"Your shift swap request with {swap.ToEmployeeId} for {swap.ShiftDate:dd MMM yyyy} was rejected by {rejecterRole}." + (!string.IsNullOrWhiteSpace(remarks) ? $" Remarks: {remarks}" : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            _context.UserNotifications.Add(new UserNotification
            {
                Employee_Id = swap.ToEmployeeId,
                Title = "Shift Swap Rejected",
                Message = $"Shift swap request with {swap.FromEmployeeId} for {swap.ShiftDate:dd MMM yyyy} was rejected by {rejecterRole}." + (!string.IsNullOrWhiteSpace(remarks) ? $" Remarks: {remarks}" : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return (true, $"Shift swap request rejected by {rejecterRole}.", swap.Status);
        }

        #endregion

        #region Smart Workflow Methods (Auto-Detect Stage)

        public async Task<bool> AcceptSwapAsync(int id, string? approvedBy = null)
        {
            var result = await AcceptSwapDetailedAsync(id, approvedBy);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> AcceptSwapDetailedAsync(int id, string? approvedBy = null)
        {
            var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
            if (swap == null)
                return (false, $"Shift swap request with ID {id} was not found.", null);

            if (IsPendingEmployeeApproval(swap.Status))
            {
                return await EmployeeAcceptSwapDetailedAsync(id, approvedBy);
            }
            else if (IsPendingAdminApproval(swap.Status))
            {
                return await AdminApproveSwapDetailedAsync(id, approvedBy);
            }
            else if (IsApproved(swap.Status))
            {
                return (false, $"Shift swap request #{id} has already been approved (Current status: '{swap.Status}').", swap.Status);
            }
            else if (IsRejected(swap.Status))
            {
                return (false, $"Shift swap request #{id} has already been rejected (Current status: '{swap.Status}').", swap.Status);
            }

            return (false, $"Shift swap request #{id} cannot be accepted in its current status: '{swap.Status}'.", swap.Status);
        }

        public async Task<bool> RejectSwapAsync(int id, string? remarks = null, string? rejectedBy = null)
        {
            var result = await RejectSwapDetailedAsync(id, remarks, rejectedBy);
            return result.Success;
        }

        public async Task<(bool Success, string Message, string? CurrentStatus)> RejectSwapDetailedAsync(int id, string? remarks = null, string? rejectedBy = null)
        {
            var swap = await _context.ShiftSwaps.FirstOrDefaultAsync(x => x.SwapId == id);
            if (swap == null)
                return (false, $"Shift swap request with ID {id} was not found.", null);

            if (IsPendingEmployeeApproval(swap.Status))
            {
                return await EmployeeRejectSwapDetailedAsync(id, remarks, rejectedBy);
            }
            else if (IsPendingAdminApproval(swap.Status))
            {
                return await AdminRejectSwapDetailedAsync(id, remarks, rejectedBy);
            }
            else if (IsApproved(swap.Status))
            {
                return (false, $"Shift swap request #{id} cannot be rejected because it is already approved (Current status: '{swap.Status}').", swap.Status);
            }
            else if (IsRejected(swap.Status))
            {
                return (false, $"Shift swap request #{id} is already rejected (Current status: '{swap.Status}').", swap.Status);
            }

            return (false, $"Shift swap request #{id} cannot be rejected in its current status: '{swap.Status}'.", swap.Status);
        }

        #endregion

        public async Task<bool> DeleteAsync(int id)
        {
            var swap = await _context.ShiftSwaps.FindAsync(id);
            if (swap == null || IsApproved(swap.Status))
                return false;

            _context.ShiftSwaps.Remove(swap);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
