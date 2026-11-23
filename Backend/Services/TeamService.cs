//using ClosedXML.Excel;
//using EmployeeManagementSystem.Data;
//using EmployeeManagementSystem.DTOs;
//using EmployeeManagementSystem.Helpers;
//using EmployeeManagementSystem.Interfaces;
//using EmployeeManagementSystem.Models;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using System.Security.Claims;

//namespace EmployeeManagementSystem.Services
//{
//    public class TeamService : ITeamService
//    {
//        private static readonly string[] ValidWeekDays =
//            { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };

//        private static List<string> NormalizeWeeklyOffDays(IEnumerable<string>? days)
//        {
//            if (days == null)
//                return new List<string> { "Saturday", "Sunday" };

//            return days
//                .Where(x => !string.IsNullOrWhiteSpace(x))
//                .Select(x => ValidWeekDays.FirstOrDefault(d =>
//                    d.Equals(x.Trim(), StringComparison.OrdinalIgnoreCase)))
//                .Where(x => x != null)
//                .Distinct(StringComparer.OrdinalIgnoreCase)
//                .Cast<string>()
//                .ToList();
//        }

//        private static bool HasValidWeeklyOffDays(IEnumerable<string>? days)
//        {
//            if (days == null)
//                return true;

//            var values = days.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
//            return values.Count >= 1 &&
//                   values.Count <= 6 &&
//                   values.All(x => ValidWeekDays.Any(d =>
//                       d.Equals(x.Trim(), StringComparison.OrdinalIgnoreCase)));
//        }

//        private static List<string> ParseWeeklyOffDays(string? days)
//        {
//            if (string.IsNullOrWhiteSpace(days))
//                return new List<string> { "Saturday", "Sunday" };

//            return NormalizeWeeklyOffDays(days.Split(',', StringSplitOptions.RemoveEmptyEntries));
//        }


//        private readonly AppDbContext _context;
//        private readonly IAdminNotificationService _notificationService;
//        private readonly IHttpContextAccessor _httpContextAccessor;
//        private readonly IFcmNotificationService _fcmNotificationService;

//        public TeamService(
//            AppDbContext context,
//            IAdminNotificationService notificationService,
//            IHttpContextAccessor httpContextAccessor,
//            IFcmNotificationService fcmNotificationService)
//        {
//            _context = context;
//            _notificationService = notificationService;
//            _httpContextAccessor = httpContextAccessor;
//            _fcmNotificationService = fcmNotificationService;
//        }

//        // ==========================================
//        // CREATE TEAM
//        // ==========================================
//        public async Task<IActionResult> CreateTeam(CreateTeamDto dto, ClaimsPrincipal? user = null)
//        {
//            if (dto == null)
//                return new BadRequestObjectResult("Invalid team data.");

//            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
//                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");

//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var teamNumber = dto.TeamNumber?.Trim() ?? "";

//            // 1. VALIDATE TEAM NUMBER
//            if (string.IsNullOrWhiteSpace(teamNumber))
//                return new BadRequestObjectResult("Team Number is required.");

//            // 2. VALIDATE REPORTING MANAGER
//            var manager = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                .FirstOrDefaultAsync(x => x.Employee_Id == dto.ReportingManagerId);

//            if (manager == null)
//            {
//                return new BadRequestObjectResult("Reporting Manager not found.");
//            }

//            // 3. GET PROJECT (OPTIONAL FOR TRAINING)
//            Project? project = null;
//            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
//            {
//                project = await _context.Projects
//                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

//                if (project == null)
//                {
//                    return new BadRequestObjectResult("Project not found.");
//                }

//                // 4. CHECK WHETHER TEAM ALREADY EXISTS FOR THIS PROJECT
//                var existingTeam = await _context.Teams
//                    .FirstOrDefaultAsync(x => x.ProjectId == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

//                if (existingTeam != null)
//                {
//                    return new BadRequestObjectResult($"A team already exists for project '{project.Project_Name}'.");
//                }
//            }

//            var effectiveOrgId = orgId ?? manager.OrganizationId ?? project?.OrganizationId;
//            if (!effectiveOrgId.HasValue || effectiveOrgId.Value <= 0)
//            {
//                return new BadRequestObjectResult("Organization context is required to create a team.");
//            }

//            if (await _context.Teams.AnyAsync(x => x.OrganizationId == effectiveOrgId.Value && x.TeamNumber == teamNumber))
//            {
//                return new BadRequestObjectResult("Team Number already exists.");
//            }

//            // 5. DETERMINE TEAM NAME
//            string resolvedTeamName = !string.IsNullOrWhiteSpace(dto.TeamName)
//                ? dto.TeamName.Trim()
//                : (project?.Project_Name ?? "Training Team");

//            // 6. CREATE TEAM
//            var team = new Team
//            {
//                OrganizationId = effectiveOrgId.Value,
//                TeamNumber = teamNumber,
//                TeamName = resolvedTeamName,
//                ReportingManagerId = dto.ReportingManagerId,
//                EngagementType = dto.EngagementType,
//                ProjectId = dto.ProjectId.HasValue && dto.ProjectId.Value > 0 ? dto.ProjectId : null,
//                ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null,
//                WeeklyOffDays = string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays)),
//                IsActive = true,
//                CreatedAt = DateTime.Now
//            };

//            _context.Teams.Add(team);
//            await _context.SaveChangesAsync();

//            // 7. SAVE REPORTING DAYS (WITH EFFECTIVE DATES)
//            var now = DateTime.Now;
//            foreach (var day in dto.ReportingDays.Distinct())
//            {
//                _context.TeamReportingDays.Add(new TeamReportingDay
//                {
//                    TeamId = team.Id,
//                    DayName = day,
//                    EffectiveFrom = now,
//                    EffectiveTo = null
//                });
//            }

//            // 8. RESOLVE MEMBERS TO ADD
//            var projectMembers = dto.ProjectId.HasValue && dto.ProjectId.Value > 0
//                ? await _context.ProjectTeamMembers
//                    .Where(x => x.ProjectId == dto.ProjectId.Value)
//                    .Select(x => x.EmployeeId)
//                    .Distinct()
//                    .ToListAsync()
//                : new List<string>();

//            var membersToAdd = projectMembers.Any()
//                ? projectMembers
//                : dto.EmployeeIds
//                    .Where(x => !string.IsNullOrWhiteSpace(x))
//                    .Distinct()
//                    .ToList();

//            // 9. ADD MEMBERS TO TEAM (Default: No Shift for newly added members)
//            foreach (var employeeId in membersToAdd)
//            {
//                var employeeExists = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                    .AnyAsync(x => x.Employee_Id == employeeId);

//                if (!employeeExists)
//                {
//                    return new BadRequestObjectResult($"Employee '{employeeId}' does not exist.");
//                }

//                var tm = new TeamMember
//                {
//                    TeamId = team.Id,
//                    EmployeeId = employeeId
//                };
//                _context.TeamMembers.Add(tm);
//                await _context.SaveChangesAsync();

//                // Ensure newly added employee does NOT inherit team's shift by default (Scenario B: No Shift)
//                _context.TeamMemberOverrides.Add(new TeamMemberOverride
//                {
//                    TeamMemberId = tm.Id,
//                    CustomShift = true,
//                    OverrideShiftId = null
//                });

//                // Assign team's reporting days to this newly added member
//                foreach (var day in dto.ReportingDays
//                             .Where(x => !string.IsNullOrWhiteSpace(x))
//                             .Distinct(StringComparer.OrdinalIgnoreCase))
//                {
//                    _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                    {
//                        TeamMemberId = tm.Id,
//                        DayName = day
//                    });
//                }
//            }

//            await _context.SaveChangesAsync();

//            foreach (var employeeId in membersToAdd.Distinct())

//            {

//                var employee = await _context.Employees

//                    .AsNoTracking()

//                    .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

//                if (employee == null)

//                    continue;

//                try

//                {


//                    var fcmResult = await _fcmNotificationService.SendToEmployeeAsync(

//                        employeeId: employee.Employee_Id,

//                        title: "Added to new team",

//                        body: $"You have been assigned to team '{team.TeamName}'.",

//                        type: "TEAM_ASSIGNED",

//                        screen: "MyTeam",

//                        data: new Dictionary<string, string>

//                        {

//                            ["teamId"] = team.Id.ToString()

//                        });

//                    Console.WriteLine(

//                        $"FCM result for {employee.Employee_Id}: " +

//                        $"Devices={fcmResult.DevicesFound}, " +

//                        $"Success={fcmResult.SuccessCount}, " +

//                        $"Failure={fcmResult.FailureCount}, " +

//                        $"Status={fcmResult.Status}");


//                }

//                catch (Exception ex)

//                {

//                    // Push notification failure must not undo team creation.

//                    Console.WriteLine(

//                        $"FCM notification failed for employee {employee.Employee_Id}: {ex.Message}");

//                }

//            }




//            return new OkObjectResult(new
//            {
//                Message = "Team Created Successfully.",
//                TeamId = team.Id,
//                TeamName = team.TeamName,
//                ProjectId = team.ProjectId,
//                ProjectName = project?.Project_Name,
//                MemberCount = membersToAdd.Count
//            });
//        }

//        // ==========================================
//        // GET TEAMS
//        // ==========================================
//        public async Task<IActionResult> GetTeams(ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var query = _context.Teams
//                .Include(x => x.Project)
//                .Include(x => x.ReportingManager)
//                .Include(x => x.Shift)
//                .Include(x => x.Members)
//                    .ThenInclude(m => m.Employee)
//                .AsNoTracking();

//            if (orgId.HasValue && orgId.Value > 0)
//            {
//                query = query.Where(x => x.OrganizationId == orgId.Value);
//            }
//            else if (adminIds != null && adminIds.Any())
//            {
//                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
//                    .Select(e => e.Employee_Id)
//                    .ToListAsync();

//                query = query.Where(x => tenantEmpIds.Contains(x.ReportingManagerId));
//            }
//            else
//            {
//                return new OkObjectResult(new List<TeamListDto>());
//            }

//            var teams = await query.ToListAsync();

//            if (!teams.Any())
//                return new OkObjectResult(new List<TeamListDto>());

//            var teamIds = teams.Select(x => x.Id).ToList();

//            // Get complete reporting-day history for timeline
//            var reportingDayHistory = await _context.TeamReportingDays
//                .Where(x => teamIds.Contains(x.TeamId))
//                .AsNoTracking()
//                .OrderBy(x => x.TeamId)
//                .ThenBy(x => x.EffectiveFrom)
//                .ToListAsync();

//            var result = teams.Select(x =>
//            {
//                var teamReportingDays = reportingDayHistory
//                    .Where(d =>
//                        d.TeamId == x.Id &&
//                        (d.EffectiveTo == null || d.EffectiveTo > DateTime.Now) &&
//                        !string.Equals(d.DayName, "NONE", StringComparison.OrdinalIgnoreCase))
//                    .Select(d => new ReportingDayDto
//                    {
//                        DayName = GetShortDayName(d.DayName),
//                        EffectiveFrom = d.EffectiveFrom,
//                        EffectiveTo = d.EffectiveTo,
//                        ActualDates = GetActualReportingDates(
//                            d.DayName,
//                            d.EffectiveFrom ?? DateTime.MinValue,
//                            d.EffectiveTo)
//                    })
//                    .ToList();

//                return new TeamListDto
//                {
//                    TeamId = x.Id,
//                    TeamNumber = x.TeamNumber,
//                    TeamName = x.TeamName,
//                    ProjectName = x.Project?.Project_Name,
//                    ManagerName = x.ReportingManager?.Name,
//                    EngagementType = x.EngagementType,
//                    ShiftId = x.ShiftId,
//                    ShiftName = x.Shift?.ShiftName,
//                    WeeklyOffDays = ParseWeeklyOffDays(x.WeeklyOffDays),
//                    EmployeeNames = x.Members.Where(m => m.Employee != null).Select(m => m.Employee.Name).ToList(),
//                    Members = x.Members.Where(m => m.Employee != null).Select(m => new TeamMemberSummaryDto
//                    {
//                        EmployeeId = m.Employee.Employee_Id,
//                        Name = m.Employee.Name
//                    }).ToList(),
//                    ReportingDays = teamReportingDays
//                };
//            }).ToList();

//            return new OkObjectResult(result);
//        }

//        // ==========================================
//        // GET PROJECT TEAMS
//        // ==========================================
//        public async Task<IActionResult> GetProjectTeams(ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var projectQuery = _context.Projects.AsNoTracking();
//            var teamQuery = _context.Teams.AsNoTracking();

//            if (orgId.HasValue && orgId.Value > 0)
//            {
//                projectQuery = projectQuery.Where(p => p.OrganizationId == orgId.Value);
//                teamQuery = teamQuery.Where(t => t.OrganizationId == orgId.Value);
//            }
//            else if (adminIds != null && adminIds.Any())
//            {
//                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
//                    .Select(e => e.Employee_Id)
//                    .ToListAsync();

//                teamQuery = teamQuery.Where(t => tenantEmpIds.Contains(t.ReportingManagerId));
//            }
//            else
//            {
//                return new OkObjectResult(new List<object>());
//            }

//            var projects = await projectQuery
//                .Select(p => new
//                {
//                    ProjectId = p.Id,
//                    ProjectName = p.Project_Name
//                })
//                .ToListAsync();

//            var teams = await teamQuery
//                .Select(t => new
//                {
//                    TeamId = t.Id,
//                    t.ProjectId,
//                    t.TeamNumber,
//                    t.TeamName,
//                    t.ReportingManagerId,
//                    t.EngagementType,
//                    t.IsActive
//                })
//                .ToListAsync();

//            var result = projects
//                .Select(project =>
//                {
//                    var team = teams.FirstOrDefault(t => t.ProjectId == project.ProjectId);

//                    return new
//                    {
//                        project.ProjectId,
//                        project.ProjectName,
//                        TeamExists = team != null,
//                        TeamId = team?.TeamId,
//                        TeamNumber = team?.TeamNumber,
//                        TeamName = team?.TeamName ?? project.ProjectName,
//                        ReportingManagerId = team?.ReportingManagerId,
//                        EngagementType = team?.EngagementType,
//                        IsActive = team?.IsActive ?? true
//                    };
//                })
//                .OrderBy(x => x.ProjectName)
//                .ToList();

//            return new OkObjectResult(result);
//        }

//        // ==========================================
//        // HELPERS
//        // ==========================================
//        private static string GetShortDayName(string day)
//        {
//            return day switch
//            {
//                "Monday" => "Mon",
//                "Tuesday" => "Tue",
//                "Wednesday" => "Wed",
//                "Thursday" => "Thu",
//                "Friday" => "Fri",
//                "Saturday" => "Sat",
//                "Sunday" => "Sun",
//                _ => day
//            };
//        }

//        private static List<DateTime> GetActualReportingDates(
//            string dayName,
//            DateTime effectiveFrom,
//            DateTime? effectiveTo)
//        {
//            var targetDay = dayName.Trim().ToLowerInvariant() switch
//            {
//                "monday" or "mon" => DayOfWeek.Monday,
//                "tuesday" or "tue" => DayOfWeek.Tuesday,
//                "wednesday" or "wed" => DayOfWeek.Wednesday,
//                "thursday" or "thu" => DayOfWeek.Thursday,
//                "friday" or "fri" => DayOfWeek.Friday,
//                "saturday" or "sat" => DayOfWeek.Saturday,
//                "sunday" or "sun" => DayOfWeek.Sunday,
//                _ => DayOfWeek.Monday
//            };

//            var startDate = effectiveFrom.Date;
//            var endDate = effectiveTo?.Date ?? DateTime.Today;
//            var dates = new List<DateTime>();

//            if (endDate < startDate)
//                return dates;

//            var daysUntilTarget = ((int)targetDay - (int)startDate.DayOfWeek + 7) % 7;
//            var actualDate = startDate.AddDays(daysUntilTarget);

//            while (actualDate <= endDate)
//            {
//                dates.Add(actualDate);
//                actualDate = actualDate.AddDays(7);
//            }

//            return dates;
//        }

//        private List<string> GetComplementDays(List<string> wfoDays)
//        {
//            var allDays = new List<string>
//            {
//                "Mon",
//                "Tue",
//                "Wed",
//                "Thu",
//                "Fri"
//            };

//            return allDays
//                .Except(wfoDays)
//                .ToList();
//        }

//        // ==========================================
//        // GET TEAM DETAILS
//        // ==========================================
//        public async Task<IActionResult> GetTeamDetails(int teamId, ClaimsPrincipal? user = null, DateTime? date = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var team = await _context.Teams
//                .Include(x => x.Project)
//                .Include(x => x.ReportingManager)
//                .Include(x => x.ReportingDays)
//                .Include(x => x.Shift)
//                .Include(x => x.Members)
//                    .ThenInclude(m => m.Employee)
//                .AsNoTracking()
//                .FirstOrDefaultAsync(x => x.Id == teamId);

//            if (team == null)
//            {
//                return new NotFoundObjectResult("Team Not Found.");
//            }

//            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
//            {
//                return new NotFoundObjectResult("Team Not Found.");
//            }

//            var memberIds = team.Members?
//                .Select(m => m.Id)
//                .ToList() ?? new List<int>();

//            var memberEmployeeIds = team.Members?
//                .Where(m => m.Employee != null)
//                .Select(m => m.Employee.Employee_Id)
//                .Distinct()
//                .ToList() ?? new List<string>();

//            var targetDate = date?.Date ?? DateTime.Today;

//            var effectiveOrgId = orgId ?? team.OrganizationId;
//            var allShifts = await _context.ShiftMasters
//                .Where(s => !effectiveOrgId.HasValue || s.OrganizationId == effectiveOrgId.Value)
//                .AsNoTracking()
//                .ToListAsync();

//            var rostersToday = await _context.ShiftRosters
//                .Where(r => memberEmployeeIds.Contains(r.Employee_Id) && r.RosterDate.Date == targetDate)
//                .AsNoTracking()
//                .ToListAsync();

//            var assignments = await _context.EmployeeShiftAssignments
//                .Include(a => a.Shift)
//                .Where(a => memberEmployeeIds.Contains(a.Employee_Id) && a.IsActive)
//                .AsNoTracking()
//                .ToListAsync();

//            var overrides = await _context.TeamMemberOverrides
//                .Include(x => x.OverrideProject)
//                .Include(x => x.OverrideShift)
//                .Where(x => memberIds.Contains(x.TeamMemberId))
//                .ToListAsync();

//            var overrideDays = await _context.TeamMemberReportingDays
//                .Where(x => memberIds.Contains(x.TeamMemberId))
//                .ToListAsync();

//            var technologyLookup = await _context.ProjectTeamMembers
//                .AsNoTracking()
//                .Where(x => x.ProjectId == team.ProjectId && memberEmployeeIds.Contains(x.EmployeeId))
//                .GroupBy(x => x.EmployeeId)
//                .ToDictionaryAsync(
//                    g => g.Key,
//                    g => g.Select(x => x.Technology).FirstOrDefault());

//            // 1. Check for explicit week-specific override (where EffectiveTo != null) covering targetDate
//            var weekOverrideDays = team.ReportingDays != null
//                ? team.ReportingDays
//                    .Where(d => d.EffectiveTo != null &&
//                                (targetDate < DateTime.Today || d.EffectiveTo > DateTime.Now) &&
//                                d.EffectiveFrom.HasValue &&
//                                d.EffectiveFrom.Value.Date <= targetDate &&
//                                d.EffectiveTo.Value.Date >= targetDate)
//                    .Select(d => GetShortDayName(d.DayName))
//                    .Distinct()
//                    .ToList()
//                : new List<string>();

//            // 2. If no week-specific override, fall back to open-ended baseline default
//            var activeTeamDays = weekOverrideDays.Any()
//                ? weekOverrideDays
//                : (team.ReportingDays != null
//                    ? team.ReportingDays
//                        .Where(d => d.EffectiveTo == null)
//                        .Select(d => GetShortDayName(d.DayName))
//                        .Distinct()
//                        .ToList()
//                    : new List<string>());

//            var dto = new TeamDetailDto
//            {
//                TeamId = team.Id,
//                TeamNumber = team.TeamNumber,
//                TeamName = team.TeamName,
//                ProjectId = team.ProjectId,
//                ProjectName = team.Project?.Project_Name ?? "",
//                ReportingManagerId = team.ReportingManagerId,
//                ReportingManager = team.ReportingManager?.Name ?? "",
//                EngagementType = team.EngagementType,
//                ShiftId = team.ShiftId,
//                ShiftName = team.Shift?.ShiftName,
//                ReportingDays = activeTeamDays,
//                WeeklyOffDays = ParseWeeklyOffDays(team.WeeklyOffDays),

//                Members = (team.Members ?? new List<TeamMember>()).Select(x =>
//                {
//                    var empId = x.Employee?.Employee_Id ?? x.EmployeeId ?? "";
//                    var roster = rostersToday.FirstOrDefault(r => r.Employee_Id == empId);
//                    var memberOverride = overrides.FirstOrDefault(o => o.TeamMemberId == x.Id);

//                    int? effectiveShiftId;
//                    string? effectiveShiftName;

//                    bool hasExplicitCustomShift = memberOverride != null && memberOverride.CustomShift;

//                    if (hasExplicitCustomShift)
//                    {
//                        // Explicit override (either assigned shift or unassigned/null)
//                        effectiveShiftId = memberOverride!.OverrideShiftId;
//                        effectiveShiftName = memberOverride.OverrideShiftId.HasValue
//                            ? (memberOverride.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == memberOverride.OverrideShiftId.Value)?.ShiftName)
//                            : null;
//                    }
//                    else
//                    {
//                        // Inherit daily roster if present, otherwise team default shift
//                        effectiveShiftId = roster?.ShiftId ?? team.ShiftId;
//                        effectiveShiftName = (roster != null
//                            ? allShifts.FirstOrDefault(s => s.ShiftId == roster.ShiftId)?.ShiftName
//                            : null)
//                            ?? team.Shift?.ShiftName;
//                    }

//                    var memberOverrideDays = overrideDays
//                        .Where(r => r.TeamMemberId == x.Id)
//                        .Select(r => GetShortDayName(r.DayName))
//                        .Distinct()
//                        .ToList();

//                    var shortDays = (memberOverride != null && memberOverride.CustomReportingDays && memberOverrideDays.Any())
//                        ? memberOverrideDays
//                        : activeTeamDays;

//                    var wfhDays = GetComplementDays(shortDays);

//                    return new TeamMemberDto
//                    {
//                        TeamMemberId = x.Id,
//                        EmployeeId = empId,
//                        EmployeeName = x.Employee?.Name ?? "",
//                        Name = x.Employee?.Name ?? "",
//                        Email = x.Employee?.Email ?? "",
//                        Role = x.Employee?.RoleName ?? "",
//                        Technology = technologyLookup.TryGetValue(empId, out var tech) ? tech : null,
//                        ProjectName = memberOverride != null && memberOverride.DifferentProject && memberOverride.OverrideProject != null
//                            ? memberOverride.OverrideProject.Project_Name
//                            : (team.Project?.Project_Name ?? ""),
//                        OverrideProjectId = memberOverride?.OverrideProjectId,
//                        OverrideProjectName = memberOverride?.OverrideProject?.Project_Name ?? "",
//                        CustomShift = hasExplicitCustomShift,
//                        ShiftId = effectiveShiftId,
//                        ShiftName = effectiveShiftName,
//                        OverrideShiftId = hasExplicitCustomShift ? memberOverride!.OverrideShiftId : null,
//                        OverrideShiftName = hasExplicitCustomShift ? effectiveShiftName : null,
//                        CrossTeam = memberOverride?.DifferentProject ?? false,
//                        CustomReportingDays = memberOverride?.CustomReportingDays ?? false,
//                        CustomWeeklyOffDays = memberOverride?.CustomWeeklyOffDays ?? false,
//                        OverrideWeeklyOffDays = string.IsNullOrWhiteSpace(memberOverride?.OverrideWeeklyOffDays)
//                            ? new List<string>()
//                            : ParseWeeklyOffDays(memberOverride.OverrideWeeklyOffDays),
//                        OverrideWfoDays = shortDays,
//                        OverrideWfhDays = wfhDays
//                    };
//                }).ToList()
//            };

//            return new OkObjectResult(dto);
//        }

//        // ==========================================
//        // UPDATE TEAM
//        // ==========================================
//        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto, ClaimsPrincipal? user = null)
//        {
//            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
//                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var team = await _context.Teams
//                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

//            if (team == null)
//                return new NotFoundObjectResult("Team not found.");

//            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
//                return new NotFoundObjectResult("Team not found.");

//            // Validate Reporting Manager
//            var manager = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                .FirstOrDefaultAsync(x => x.Employee_Id == dto.ReportingManagerId);

//            if (manager == null)
//                return new BadRequestObjectResult("Reporting Manager not found.");

//            // Validate Project (optional for Training teams)
//            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
//            {
//                var project = await _context.Projects
//                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

//                if (project == null)
//                    return new BadRequestObjectResult("Project not found.");

//                team.ProjectId = dto.ProjectId.Value;
//            }
//            else
//            {
//                team.ProjectId = null;
//            }

//            if (orgId.HasValue && (!team.OrganizationId.HasValue || team.OrganizationId.Value == 0))
//            {
//                team.OrganizationId = orgId.Value;
//            }

//            if (!string.IsNullOrWhiteSpace(dto.TeamNumber))
//            {
//                var trimmedTeamNumber = dto.TeamNumber.Trim().ToUpper();
//                if (!string.Equals(team.TeamNumber, trimmedTeamNumber, StringComparison.OrdinalIgnoreCase))
//                {
//                    var exists = await _context.Teams.AnyAsync(x => x.Id != team.Id && x.TeamNumber == trimmedTeamNumber && (!orgId.HasValue || x.OrganizationId == orgId.Value));
//                    if (exists)
//                        return new BadRequestObjectResult("Team Number already exists.");
//                    team.TeamNumber = trimmedTeamNumber;
//                }
//            }

//            team.TeamName = dto.TeamName;
//            team.ReportingManagerId = dto.ReportingManagerId;
//            team.EngagementType = dto.EngagementType;
//            team.ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null;
//            if (dto.WeeklyOffDays != null)
//                team.WeeklyOffDays = string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays));

//            // Update Reporting Days
//            var oldDays = await _context.TeamReportingDays
//                .Where(x => x.TeamId == dto.TeamId)
//                .ToListAsync();

//            _context.TeamReportingDays.RemoveRange(oldDays);

//            var now = DateTime.Now;
//            foreach (var day in dto.ReportingDays.Distinct())
//            {
//                _context.TeamReportingDays.Add(new TeamReportingDay
//                {
//                    TeamId = dto.TeamId,
//                    DayName = day,
//                    EffectiveFrom = now,
//                    EffectiveTo = null
//                });
//            }

//            // Update Members
//            var oldMembers = await _context.TeamMembers
//                .Where(x => x.TeamId == dto.TeamId)
//                .ToListAsync();

//            var oldMemberIds = oldMembers.Select(m => m.Id).ToList();
//            var existingOverrides = await _context.TeamMemberOverrides
//                .Where(o => oldMemberIds.Contains(o.TeamMemberId))
//                .ToListAsync();

//            _context.TeamMembers.RemoveRange(oldMembers);
//            await _context.SaveChangesAsync();

//            foreach (var emp in dto.EmployeeIds.Distinct())
//            {
//                var employee = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

//                if (employee == null)
//                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

//                var newTm = new TeamMember
//                {
//                    TeamId = dto.TeamId,
//                    EmployeeId = emp
//                };
//                _context.TeamMembers.Add(newTm);
//                await _context.SaveChangesAsync();

//                var oldTm = oldMembers.FirstOrDefault(m => m.EmployeeId == emp);
//                bool isExistingMember = oldTm != null;

//                if (isExistingMember)
//                {
//                    // Scenario C: Existing members inherit team's new shift!
//                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
//                    {
//                        TeamMemberId = newTm.Id,
//                        CustomShift = false, // Inherits team's new shift
//                        OverrideShiftId = null
//                    });
//                }
//                else
//                {
//                    // Scenario B: Newly added members get No Shift (unassigned), but inherit team reporting days
//                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
//                    {
//                        TeamMemberId = newTm.Id,
//                        CustomShift = true, // Explicitly blocks team shift
//                        OverrideShiftId = null // Unassigned
//                    });

//                    foreach (var day in dto.ReportingDays.Distinct())
//                    {
//                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                        {
//                            TeamMemberId = newTm.Id,
//                            DayName = day
//                        });
//                    }
//                }
//            }

//            await _context.SaveChangesAsync();

//            // Clear attendance shift cache for all members so new shift applies immediately
//            foreach (var employeeId in newEmployeeIds.Concat(removedEmployeeIds)

//               .Distinct(StringComparer.OrdinalIgnoreCase))

//            {

//                AttendanceService.ClearShiftCache(employeeId);

//            }

//            // Detect actual team detail changes.

//            bool teamDetailsChanged =

//                 oldTeamName != team.TeamName ||

//                 oldManagerId != team.ReportingManagerId ||

//                 oldProjectId != team.ProjectId ||

//                 oldEngagementType != team.EngagementType ||

//                 oldShiftId != team.ShiftId ||

//                 oldTeamNumber != team.TeamNumber ||

//                 oldWeeklyOffDays != team.WeeklyOffDays ||

//                 reportingDaysChanged;

//            bool membershipChanged =

//                 addedEmployeeIds.Any() || removedEmployeeIds.Any();

//            // Send notifications after successful database saves.

//            if (teamDetailsChanged || membershipChanged)

//            {

//                // Notify employees who are currently in this team.

//                foreach (var employeeId in newEmployeeIds)

//                {

//                    bool isNewMember = addedEmployeeIds.Contains(

//                        employeeId,

//                        StringComparer.OrdinalIgnoreCase);

//                    try

//                    {

//                        var result = await _fcmNotificationService.SendToEmployeeAsync(

//                            employeeId: employeeId,

//                            title: isNewMember

//                                ? "Team Assignment"

//                                : "Team Updated",

//                            body: isNewMember

//                                ? $"You have been assigned to team '{team.TeamName}'."

//                                : $"Team '{team.TeamName}' details have been updated.",

//                            type: isNewMember

//                                ? "TEAM_ASSIGNED"

//                                : "TEAM_UPDATED",

//                            screen: "MyTeam",

//                            data: new Dictionary<string, string>

//                            {

//                                ["teamId"] = team.Id.ToString()

//                            });

//                        Console.WriteLine(

//                            $"Team update FCM: Employee={employeeId}, " +

//                            $"Success={result.SuccessCount}, " +

//                            $"Failure={result.FailureCount}, " +

//                            $"Status={result.Status}");

//                    }

//                    catch (Exception ex)

//                    {

//                        Console.WriteLine(

//                            $"Team update notification failed for {employeeId}: {ex.Message}");

//                    }

//                }

//                // Notify employees who were removed from this team.

//                foreach (var employeeId in removedEmployeeIds)

//                {

//                    try

//                    {

//                        var result = await _fcmNotificationService.SendToEmployeeAsync(

//                            employeeId: employeeId,

//                            title: "Team Membership Updated",

//                            body: $"You have been removed from team '{team.TeamName}'.",

//                            type: "TEAM_REMOVED",

//                            screen: "MyTeam",

//                            data: new Dictionary<string, string>

//                            {

//                                ["teamId"] = team.Id.ToString()

//                            });

//                        Console.WriteLine(

//                            $"Team removal FCM: Employee={employeeId}, " +

//                            $"Success={result.SuccessCount}, " +

//                            $"Failure={result.FailureCount}, " +

//                            $"Status={result.Status}");

//                    }

//                    catch (Exception ex)

//                    {

//                        Console.WriteLine(

//                            $"Team removal notification failed for {employeeId}: {ex.Message}");

//                    }

//                }

//            }


//            return new OkObjectResult("Team Updated Successfully.");
//        }

//        // ==========================================
//        // DELETE TEAM
//        // ==========================================
//        public async Task<IActionResult> DeleteTeam(int teamId, ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var team = await _context.Teams
//                .FirstOrDefaultAsync(x => x.Id == teamId);

//            if (team == null)
//                return new NotFoundResult();

//            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
//                return new NotFoundResult();

//            _context.Teams.Remove(team);
//            await _context.SaveChangesAsync();

//            return new NoContentResult();
//        }

//        // ==========================================
//        // ADD MEMBERS
//        // ==========================================
//        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto, ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var team = await _context.Teams
//                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

//            if (team == null)
//                return new NotFoundObjectResult("Team not found.");

//            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
//                return new NotFoundObjectResult("Team not found.");

//            var newlyAddedEmployeeIds = new List<string>();

//            // Get active reporting days for this team
//            var activeDays = await _context.TeamReportingDays
//                .Where(d => d.TeamId == team.Id && d.EffectiveTo == null)
//                .Select(d => d.DayName)
//                .Distinct()
//                .ToListAsync();

//            foreach (var emp in dto.EmployeeIds.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
//            {
//                var employee = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

//                if (employee == null)
//                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

//                var alreadyExists = await _context.TeamMembers
//                    .AnyAsync(x => x.TeamId == team.Id && x.EmployeeId == emp);

//                if (!alreadyExists)
//                {
//                    var tm = new TeamMember
//                    {
//                        TeamId = team.Id,
//                        EmployeeId = emp
//                    };
//                    _context.TeamMembers.Add(tm);
//                    await _context.SaveChangesAsync();

//                    // Newly added member: No shift by default, gets team reporting days
//                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
//                    {
//                        TeamMemberId = tm.Id,
//                        CustomShift = true,
//                        OverrideShiftId = null
//                    });

//                    foreach (var day in activeDays)
//                    {
//                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                        {
//                            TeamMemberId = tm.Id,
//                            DayName = day
//                        });
//                    }

//                    newlyAddedEmployeeIds.Add(emp);
//                }
//            }

//            await _context.SaveChangesAsync();

//            foreach (var employeeId in newlyAddedEmployeeIds)

//            {

//                try

//                {

//                    var result = await _fcmNotificationService.SendToEmployeeAsync(

//                        employeeId: employeeId,

//                        title: "Team Assignment",

//                        body: $"You have been assigned to team '{team.TeamName}'.",

//                        type: "TEAM_ASSIGNED",

//                        screen: "MyTeam",

//                        data: new Dictionary<string, string>

//                        {

//                            ["teamId"] = team.Id.ToString()

//                        });

//                    Console.WriteLine(

//                        $"Team assignment FCM: Employee={employeeId}, " +

//                        $"Success={result.SuccessCount}, " +

//                        $"Failure={result.FailureCount}, " +

//                        $"Status={result.Status}");

//                }

//                catch (Exception ex)

//                {

//                    // Notification failure must not undo the member assignment.

//                    Console.WriteLine(

//                        $"FCM failed for employee {employeeId}: {ex.Message}");

//                }

//            }


//            return new OkObjectResult(new
//            {
//                Message = "Members Added Successfully.",
//                NewlyAddedCount = newlyAddedEmployeeIds.Count
//            });
//        }

//        // ==========================================
//        // REMOVE MEMBER
//        // ==========================================
//        public async Task<IActionResult> RemoveMember(int teamId, string employeeId, ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var member = await _context.TeamMembers
//                .Include(x => x.Team)
//                .FirstOrDefaultAsync(x => x.TeamId == teamId && x.EmployeeId == employeeId);

//            if (member == null)
//                return new NotFoundObjectResult("Member not found.");

//            if (orgId.HasValue && member.Team?.OrganizationId.HasValue == true && member.Team.OrganizationId.Value != orgId.Value)
//                return new NotFoundObjectResult("Member not found.");

//            _context.TeamMembers.Remove(member);
//            await _context.SaveChangesAsync();
//            AttendanceService.ClearShiftCache(employeeId);

//            // Notify only the removed employee

//            try

//            {

//                var result = await _fcmNotificationService.SendToEmployeeAsync(

//                    employeeId: employeeId,

//                    title: "Team Membership Updated",

//                    body: $"You have been removed from team '{team?.TeamName ?? "your team"}'.",

//                    type: "TEAM_REMOVED",

//                    screen: "MyTeam",

//                    data: new Dictionary<string, string>

//                    {

//                        ["teamId"] = teamId.ToString()

//                    });

//                Console.WriteLine(

//                    $"Team removal FCM: Employee={employeeId}, " +

//                    $"Success={result.SuccessCount}, " +

//                    $"Failure={result.FailureCount}, " +

//                    $"Status={result.Status}");

//            }

//            catch (Exception ex)

//            {

//                Console.WriteLine(

//                    $"Team removal notification failed for {employeeId}: {ex.Message}");

//            }

//            return new OkObjectResult("Member Removed Successfully.");
//        }

//        // ==========================================
//        // GET AVAILABLE EMPLOYEES
//        // ==========================================
//        public async Task<IActionResult> GetAvailableEmployees(ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var assignedEmployees = await _context.TeamMembers
//                .Where(x => x.Team != null && (!orgId.HasValue || x.Team.OrganizationId == orgId.Value))
//                .Select(x => x.EmployeeId)
//                .ToListAsync();

//            var employees = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
//                .Where(x => !assignedEmployees.Contains(x.Employee_Id) && x.RoleName != "Manager" && x.RoleName != "manager")
//                .Select(x => new
//                {
//                    x.Employee_Id,
//                    x.Name
//                })
//                .ToListAsync();

//            return new OkObjectResult(employees);
//        }

//        // ==========================================
//        // GET MANAGERS
//        // ==========================================
//        public async Task<IActionResult> GetManagers(ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var databaseName = _context.Database.GetDbConnection().Database;
//            var tenantEmployees = CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds);

//            var managers = await (
//                from e in tenantEmployees
//                join r in _context.Roles on e.RoleId equals r.RoleId into roleGroup
//                from r in roleGroup.DefaultIfEmpty()
//                where e.RoleName == "Manager" || e.RoleName == "manager" || (r != null && (r.Name == "Manager" || r.Name == "manager"))
//                orderby e.Name
//                select new
//                {
//                    e.Employee_Id,
//                    e.Name,
//                    e.Email,
//                    RoleName = e.RoleName ?? (r != null ? r.Name : "Manager")
//                })
//                .AsNoTracking()
//                .ToListAsync();

//            return new OkObjectResult(new
//            {
//                database = databaseName,
//                managers
//            });
//        }

//        // ==========================================
//        // UPDATE REPORTING DAYS (WITH TIMELINE SUPPORT)
//        // ==========================================
//        public async Task<IActionResult> UpdateTeamWeeklyOff(UpdateTeamWeeklyOffDto dto, ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var query = _context.Teams.AsQueryable();
//            if (orgId.HasValue)
//                query = query.Where(t => t.OrganizationId == orgId.Value);

//            var team = await query.FirstOrDefaultAsync(x => x.Id == dto.TeamId);

//            if (team == null)
//                return new NotFoundObjectResult("Team not found.");

//            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
//                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");

//            var requestedDays = NormalizeWeeklyOffDays(dto.WeeklyOffDays);

//            team.WeeklyOffDays = string.Join(",", requestedDays);
//            await _context.SaveChangesAsync();

//            return new OkObjectResult(new
//            {
//                Message = "Team weekly off days updated successfully.",
//                TeamId = team.Id,
//                WeeklyOffDays = requestedDays
//            });
//        }

//        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto, ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var team = await _context.Teams
//                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

//            if (team == null || (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value))
//            {
//                return new NotFoundObjectResult("Team not found.");
//            }

//            var requestedDays = (dto.ReportingDays ?? new List<string>())
//                .Where(x => !string.IsNullOrWhiteSpace(x))
//                .Select(x => x.Trim())
//                .Distinct(StringComparer.OrdinalIgnoreCase)
//                .ToList();

//            bool isWeekScoped = dto.WeekStartDate.HasValue && dto.WeekEndDate.HasValue && !dto.IsDefaultAllWeeks;

//            if (isWeekScoped)
//            {
//                var start = dto.WeekStartDate.Value.Date;
//                var end = dto.WeekEndDate.Value.Date;

//                // Remove existing override records specifically for this week window
//                var existingWeekDays = await _context.TeamReportingDays
//                    .Where(x => x.TeamId == dto.TeamId && x.EffectiveFrom.HasValue && x.EffectiveFrom.Value.Date == start && x.EffectiveTo.HasValue && x.EffectiveTo.Value.Date == end)
//                    .ToListAsync();

//                if (existingWeekDays.Any())
//                {
//                    _context.TeamReportingDays.RemoveRange(existingWeekDays);
//                }

//                // Save explicit empty override when no WFO days are selected
//                if (!requestedDays.Any())
//                {
//                    _context.TeamReportingDays.Add(new TeamReportingDay
//                    {
//                        TeamId = dto.TeamId,
//                        DayName = "NONE",
//                        EffectiveFrom = start,
//                        EffectiveTo = end
//                    });
//                }
//                else
//                {
//                    foreach (var day in requestedDays)
//                    {
//                        _context.TeamReportingDays.Add(new TeamReportingDay
//                        {
//                            TeamId = dto.TeamId,
//                            DayName = day,
//                            EffectiveFrom = start,
//                            EffectiveTo = end
//                        });
//                    }
//                }

//                // Reset custom reporting days overrides for all members in this team
//                // so that every member inherits the newly updated team reporting days
//                var teamMembers = await _context.TeamMembers
//                    .Where(m => m.TeamId == dto.TeamId)
//                    .ToListAsync();

//                var memberIds = teamMembers.Select(m => m.Id).ToList();

//                var memberOverrides = await _context.TeamMemberOverrides
//                    .Where(o => memberIds.Contains(o.TeamMemberId) && o.CustomReportingDays)
//                    .ToListAsync();

//                foreach (var o in memberOverrides)
//                {
//                    o.CustomReportingDays = false;
//                }

//                var oldMemberDays = await _context.TeamMemberReportingDays
//                    .Where(r => memberIds.Contains(r.TeamMemberId))
//                    .ToListAsync();

//                if (oldMemberDays.Any())
//                {
//                    _context.TeamMemberReportingDays.RemoveRange(oldMemberDays);
//                }

//                // If currently viewed date falls in this week, also synchronize member day records
//                var today = DateTime.Today;
//                if (today >= start && today <= end)
//                {
//                    foreach (var memberId in memberIds)
//                    {
//                        foreach (var day in requestedDays)
//                        {
//                            _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                            {
//                                TeamMemberId = memberId,
//                                DayName = day
//                            });
//                        }
//                    }
//                }

//                await _context.SaveChangesAsync();
//            }
//            else
//            {
//                var now = DateTime.Now;

//                // Get currently active baseline reporting days
//                var currentDays = await _context.TeamReportingDays
//                    .Where(x => x.TeamId == dto.TeamId && x.EffectiveTo == null)
//                    .ToListAsync();

//                var existingDays = currentDays
//                    .Select(x => x.DayName.Trim().ToLowerInvariant())
//                    .ToHashSet();

//                var newDays = requestedDays
//                    .Select(x => x.ToLowerInvariant())
//                    .ToHashSet();

//                if (existingDays.SetEquals(newDays))
//                {
//                    return new OkObjectResult("Reporting days are unchanged. No update or notification required.");
//                }

//                // Close old reporting days
//                foreach (var oldDay in currentDays)
//                {
//                    oldDay.EffectiveTo = now;
//                }

//                // Add new reporting days
//                foreach (var day in requestedDays)
//                {
//                    _context.TeamReportingDays.Add(new TeamReportingDay
//                    {
//                        TeamId = dto.TeamId,
//                        DayName = day,
//                        EffectiveFrom = now,
//                        EffectiveTo = null
//                    });
//                }

//                // Reset custom reporting days overrides for all members in this team
//                var teamMembers = await _context.TeamMembers
//                    .Where(m => m.TeamId == dto.TeamId)
//                    .ToListAsync();

//                var memberIds = teamMembers.Select(m => m.Id).ToList();

//                var memberOverrides = await _context.TeamMemberOverrides
//                    .Where(o => memberIds.Contains(o.TeamMemberId) && o.CustomReportingDays)
//                    .ToListAsync();

//                foreach (var o in memberOverrides)
//                {
//                    o.CustomReportingDays = false;
//                }

//                var oldMemberDays = await _context.TeamMemberReportingDays
//                    .Where(r => memberIds.Contains(r.TeamMemberId))
//                    .ToListAsync();

//                if (oldMemberDays.Any())
//                {
//                    _context.TeamMemberReportingDays.RemoveRange(oldMemberDays);
//                }

//                foreach (var memberId in memberIds)
//                {
//                    foreach (var day in requestedDays)
//                    {
//                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                        {
//                            TeamMemberId = memberId,
//                            DayName = day
//                        });
//                    }
//                }

//                await _context.SaveChangesAsync();
//            }

//            try
//            {
//                await _notificationService.CreateNotification(
//                    "Reporting Days Updated",
//                    $"Reporting days updated to {string.Join(", ", requestedDays)}");
//            }
//            catch (Exception ex)
//            {
//                Console.WriteLine($"Admin notification failed: {ex.Message}");
//            }

//            try

//            {

//                var teamEmployeeIds = await _context.TeamMembers

//                    .Where(m => m.TeamId == dto.TeamId)

//                    .Select(m => m.EmployeeId)

//                    .Distinct()

//                    .ToListAsync();

//                var reportingDaysText = string.Join(

//                    ", ",

//                    dto.ReportingDays ?? new List<string>());

//                foreach (var employeeId in teamEmployeeIds)

//                {

//                    try

//                    {

//                        await _userNotificationService.CreateNotification(

//                            new UserNotificationDto

//                            {

//                                Employee_Id = employeeId,

//                                Title = "Reporting Days Updated",

//                                Message = $"Team '{team.TeamName}' reporting days changed to: {reportingDaysText}."

//                            });

//                    }

//                    catch (Exception ex)

//                    {

//                        Console.WriteLine(

//                            $"Normal notification failed for employee {employeeId}: {ex.Message}");

//                    }

//                }

//            }

//            catch (Exception ex)

//            {

//                Console.WriteLine(

//                    $"Failed to create normal reporting days notifications: {ex.Message}");

//            }

//            try

//            {

//                // Notify every employee who has an active registered FCM device.

//                // Get only employees belonging to the updated team

//                var teamEmployeeIds = await _context.TeamMembers

//                    .Where(m => m.TeamId == dto.TeamId)

//                    .Select(m => m.EmployeeId)

//                    .Distinct()

//                    .ToListAsync();

//                // Get active FCM devices only for those team members

//                var registeredEmployeeIds = await _context.UserNotificationDevices

//                    .Where(d =>

//                        d.IsActive &&

//                        teamEmployeeIds.Contains(d.EmployeeId))

//                    .Select(d => d.EmployeeId)

//                    .Distinct()

//                    .ToListAsync();


//                var reportingDaysText = string.Join(

//                    ", ",

//                    dto.ReportingDays ?? new List<string>());

//                foreach (var employeeId in registeredEmployeeIds)

//                {

//                    try

//                    {

//                        var result = await _fcmNotificationService.SendToEmployeeAsync(

//                            employeeId: employeeId,

//                            title: "Reporting Days Updated",

//                            body: $"Team '{team.TeamName}' reporting days changed to: {reportingDaysText}.",

//                            type: "REPORTING_DAYS_UPDATED",

//                            screen: "MyTeam",

//                            data: new Dictionary<string, string>

//                            {

//                                ["teamId"] = team.Id.ToString()

//                            });

//                        Console.WriteLine(

//                            $"Reporting days FCM: Employee={employeeId}, " +

//                            $"Success={result.SuccessCount}, " +

//                            $"Failure={result.FailureCount}, " +

//                            $"Status={result.Status}");

//                    }

//                    catch (Exception ex)

//                    {

//                        Console.WriteLine(

//                            $"Reporting days notification failed for {employeeId}: {ex.Message}");

//                    }

//                }

//            }

//            catch (Exception ex)

//            {

//                // A notification failure must not undo the reporting-day update.

//                Console.WriteLine(

//                    $"Failed to retrieve registered devices: {ex.Message}");

//            }


//            return new OkObjectResult("Reporting Days Updated Successfully.");
//        }

//        // ==========================================
//        // GET MY TEAM
//        // ==========================================
//        public async Task<IActionResult> GetMyTeam(ClaimsPrincipal? user = null, DateTime? date = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var employeeId =
//                user?.FindFirst("EmployeeId")?.Value
//                ?? user?.FindFirst("Employee_Id")?.Value
//                ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

//            if (string.IsNullOrWhiteSpace(employeeId))
//            {
//                return new UnauthorizedObjectResult(new { message = "Employee ID not found in JWT." });
//            }

//            var teamMember = await _context.TeamMembers
//                .Include(tm => tm.TeamMemberOverride)
//                    .ThenInclude(tmo => tmo.OverrideShift)
//                .Include(tm => tm.TeamMemberOverride)
//                    .ThenInclude(tmo => tmo.OverrideProject)
//                .AsNoTracking()
//                .FirstOrDefaultAsync(tm => tm.EmployeeId == employeeId);

//            if (teamMember == null)
//            {
//                return new NotFoundObjectResult(new { message = "You are not assigned to any team." });
//            }

//            var team = await _context.Teams
//                .Include(t => t.Shift)
//                .AsNoTracking()
//                .FirstOrDefaultAsync(t => t.Id == teamMember.TeamId && t.IsActive);

//            if (team == null)
//            {
//                return new NotFoundObjectResult(new { message = "Your team was not found." });
//            }

//            var memberIds = await _context.TeamMembers
//                .Where(tm => tm.TeamId == team.Id)
//                .Select(tm => tm.Id)
//                .ToListAsync();

//            var overrides = await _context.TeamMemberOverrides
//                .Include(x => x.OverrideShift)
//                .Include(x => x.OverrideProject)
//                .Where(x => memberIds.Contains(x.TeamMemberId))
//                .ToListAsync();

//            var overrideDays = await _context.TeamMemberReportingDays
//                .Where(x => memberIds.Contains(x.TeamMemberId))
//                .ToListAsync();

//            var targetDate = date?.Date ?? DateTime.Today;

//            var effectiveOrgId = orgId ?? team.OrganizationId;
//            var allShifts = await _context.ShiftMasters
//                .Where(s => !effectiveOrgId.HasValue || s.OrganizationId == effectiveOrgId.Value)
//                .AsNoTracking()
//                .ToListAsync();

//            var rostersToday = await _context.ShiftRosters
//                .Where(r => r.RosterDate.Date == targetDate)
//                .AsNoTracking()
//                .ToListAsync();

//            // 1. Check for explicit week-specific override (where EffectiveTo != null) covering targetDate
//            var weekOverrideDays = await _context.TeamReportingDays
//                .AsNoTracking()
//                .Where(rd => rd.TeamId == team.Id &&
//                             rd.EffectiveTo != null &&
//                             (targetDate < DateTime.Today || rd.EffectiveTo > DateTime.Now) &&
//                             rd.EffectiveFrom.HasValue &&
//                             rd.EffectiveFrom.Value.Date <= targetDate &&
//                             rd.EffectiveTo.Value.Date >= targetDate)
//                .Select(rd => GetShortDayName(rd.DayName))
//                .Distinct()
//                .ToListAsync();

//            // 2. If no week-specific override, fall back to open-ended baseline default
//            List<string> baseTeamReportingDays;
//            if (weekOverrideDays.Any())
//            {
//                baseTeamReportingDays = weekOverrideDays;
//            }
//            else
//            {
//                baseTeamReportingDays = await _context.TeamReportingDays
//                    .AsNoTracking()
//                    .Where(rd => rd.TeamId == team.Id && rd.EffectiveTo == null)
//                    .Select(rd => GetShortDayName(rd.DayName))
//                    .Distinct()
//                    .ToListAsync();
//            }

//            var members = await _context.TeamMembers
//                .AsNoTracking()
//                .Where(tm => tm.TeamId == team.Id)
//                .Join(
//                    _context.Employees,
//                    tm => tm.EmployeeId,
//                    e => e.Employee_Id,
//                    (tm, e) => new
//                    {
//                        tm.Id,
//                        EmployeeId = e.Employee_Id,
//                        Name = e.Name,
//                        Role = e.RoleName ?? ""
//                    })
//                .ToListAsync();

//            var memberEmployeeIds = members.Select(m => m.EmployeeId).Distinct().ToList();

//            var technologyLookup = await _context.ProjectTeamMembers
//                .AsNoTracking()
//                .Where(x => x.ProjectId == team.ProjectId && memberEmployeeIds.Contains(x.EmployeeId))
//                .GroupBy(x => x.EmployeeId)
//                .ToDictionaryAsync(
//                    g => g.Key,
//                    g => g.Select(x => x.Technology).FirstOrDefault());

//            var memberDtos = members.Select(m =>
//            {
//                var mo = overrides.FirstOrDefault(o => o.TeamMemberId == m.Id);
//                var memberRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == m.EmployeeId);

//                bool hasExplicitCustomShift = mo != null && mo.CustomShift;
//                int? effectiveId;
//                string? effectiveName;

//                if (hasExplicitCustomShift)
//                {
//                    effectiveId = mo!.OverrideShiftId;
//                    effectiveName = mo.OverrideShiftId.HasValue
//                        ? (mo.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == mo.OverrideShiftId.Value)?.ShiftName)
//                        : null;
//                }
//                else
//                {
//                    effectiveId = memberRoster?.ShiftId ?? team.ShiftId;
//                    effectiveName = (memberRoster != null ? allShifts.FirstOrDefault(s => s.ShiftId == memberRoster.ShiftId)?.ShiftName : null)
//                        ?? team.Shift?.ShiftName;
//                }

//                var memberShortDays = overrideDays
//                    .Where(r => r.TeamMemberId == m.Id)
//                    .Select(r => GetShortDayName(r.DayName))
//                    .Distinct()
//                    .ToList();

//                var shortDays = (mo != null && mo.CustomReportingDays && memberShortDays.Any())
//                    ? memberShortDays
//                    : baseTeamReportingDays;

//                var memberWfhDays = shortDays.Any()
//                    ? GetComplementDays(shortDays)
//                    : new List<string>();

//                return new
//                {
//                    teamMemberId = m.Id,
//                    employeeId = m.EmployeeId,
//                    name = m.Name,
//                    role = m.Role,
//                    technology = technologyLookup.TryGetValue(m.EmployeeId, out var tech) ? tech : null,
//                    projectName = mo != null && mo.DifferentProject && mo.OverrideProject != null
//                        ? mo.OverrideProject.Project_Name
//                        : "",
//                    overrideProjectId = mo?.OverrideProjectId,
//                    overrideProjectName = mo?.OverrideProject?.Project_Name ?? "",
//                    customShift = hasExplicitCustomShift,
//                    shiftId = effectiveId,
//                    shiftName = effectiveName,
//                    overrideShiftId = (hasExplicitCustomShift && mo!.OverrideShiftId.HasValue) ? mo.OverrideShiftId : null,
//                    overrideShiftName = (hasExplicitCustomShift && mo!.OverrideShiftId.HasValue)
//                        ? (mo.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == mo.OverrideShiftId.Value)?.ShiftName)
//                        : null,
//                    crossTeam = mo?.DifferentProject ?? false,
//                    customReportingDays = mo?.CustomReportingDays ?? false,
//                    customWeeklyOffDays = mo?.CustomWeeklyOffDays ?? false,
//                    overrideWeeklyOffDays = string.IsNullOrWhiteSpace(mo?.OverrideWeeklyOffDays)
//                        ? new List<string>()
//                        : ParseWeeklyOffDays(mo.OverrideWeeklyOffDays),
//                    overrideWfoDays = shortDays,
//                    overrideWfhDays = memberWfhDays
//                };
//            }).ToList();

//            var project = await _context.Projects
//                .AsNoTracking()
//                .FirstOrDefaultAsync(p => p.Id == team.ProjectId);

//            var myOverride = teamMember.TeamMemberOverride;
//            var myOverrideDays = overrideDays
//                .Where(r => r.TeamMemberId == teamMember.Id)
//                .Select(r => GetShortDayName(r.DayName))
//                .Distinct()
//                .ToList();

//            var effectiveReportingDays = (myOverride != null && myOverride.CustomReportingDays && myOverrideDays.Any())
//                ? myOverrideDays
//                : baseTeamReportingDays;

//            bool myExplicitCustomShift = myOverride != null && myOverride.CustomShift;
//            int? myEffectiveShiftId;
//            string? myEffectiveShiftName;

//            if (myExplicitCustomShift)
//            {
//                myEffectiveShiftId = myOverride!.OverrideShiftId;
//                myEffectiveShiftName = myOverride.OverrideShiftId.HasValue
//                    ? (myOverride.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == myOverride.OverrideShiftId.Value)?.ShiftName)
//                    : null;
//            }
//            else
//            {
//                var myRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == employeeId);
//                myEffectiveShiftId = myRoster?.ShiftId ?? team.ShiftId;
//                myEffectiveShiftName = (myRoster != null ? allShifts.FirstOrDefault(s => s.ShiftId == myRoster.ShiftId)?.ShiftName : null)
//                    ?? team.Shift?.ShiftName;
//            }

//            return new OkObjectResult(new
//            {
//                teamId = team.Id,
//                teamNumber = team.TeamNumber,
//                teamName = team.TeamName,
//                projectId = team.ProjectId,
//                projectName = project?.Project_Name,
//                reportingManagerId = team.ReportingManagerId,
//                reportingManager = team.ReportingManager?.Name,
//                engagementType = team.EngagementType,
//                shiftId = myEffectiveShiftId,
//                shiftName = myEffectiveShiftName,
//                myShiftId = myEffectiveShiftId,
//                myShiftName = myEffectiveShiftName,
//                teamShiftId = team.ShiftId,
//                teamShiftName = team.Shift?.ShiftName,
//                reportingDays = effectiveReportingDays,
//                weeklyOffDays = ParseWeeklyOffDays(team.WeeklyOffDays),
//                members = memberDtos
//            });
//        }

//        // ==========================================
//        // MEMBER OVERRIDE
//        // ==========================================
//        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto, ClaimsPrincipal? user = null)
//        {
//            try
//            {
//                if (dto.CustomWeeklyOffDays && (dto.WeeklyOffDays == null || !HasValidWeeklyOffDays(dto.WeeklyOffDays)))
//                    return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");
//                user ??= _httpContextAccessor.HttpContext?.User;
//                var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//                TeamMember? member = null;
//                if (dto.TeamMemberId > 0)
//                {
//                    member = await _context.TeamMembers
//                        .Include(x => x.Team)
//                        .Include(x => x.Employee)
//                        .FirstOrDefaultAsync(x => x.Id == dto.TeamMemberId);
//                }

//                if (member == null && !string.IsNullOrWhiteSpace(dto.EmployeeId))
//                {
//                    var empId = dto.EmployeeId.Trim();
//                    if (dto.TeamId > 0)
//                    {
//                        member = await _context.TeamMembers
//                            .Include(x => x.Team)
//                            .Include(x => x.Employee)
//                            .FirstOrDefaultAsync(x => x.TeamId == dto.TeamId && x.EmployeeId == empId);
//                    }
//                    if (member == null)
//                    {
//                        member = await _context.TeamMembers
//                            .Include(x => x.Team)
//                            .Include(x => x.Employee)
//                            .FirstOrDefaultAsync(x => x.EmployeeId == empId);
//                    }
//                }

//                if (member == null)
//                    return new NotFoundObjectResult(new
//                    {
//                        message = "Team Member not found.",
//                        teamMemberId = dto.TeamMemberId,
//                        teamId = dto.TeamId,
//                        employeeId = dto.EmployeeId
//                    });

//                if (orgId.HasValue)
//                {
//                    if (member.Team?.OrganizationId.HasValue == true && member.Team.OrganizationId.Value != orgId.Value)
//                        return new NotFoundObjectResult("Team Member not found.");
//                    if (member.Employee?.OrganizationId.HasValue == true && member.Employee.OrganizationId.Value != orgId.Value)
//                        return new NotFoundObjectResult("Team Member not found.");
//                }

//                var overrideData = await _context.TeamMemberOverrides
//                    .FirstOrDefaultAsync(x => x.TeamMemberId == member.Id);

//                if (overrideData == null)
//                {
//                    overrideData = new TeamMemberOverride
//                    {
//                        TeamMemberId = member.Id
//                    };
//                    _context.TeamMemberOverrides.Add(overrideData);
//                }

//                overrideData.IsCrossMapped = dto.IsCrossMapped;
//                overrideData.OverrideProjectId = dto.OverrideProjectId;
//                overrideData.DifferentProject = dto.DifferentProject;
//                overrideData.CustomReportingDays = dto.CustomReportingDays;
//                overrideData.CustomWeeklyOffDays = dto.CustomWeeklyOffDays;
//                overrideData.OverrideWeeklyOffDays = dto.CustomWeeklyOffDays
//                    ? string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays))
//                    : null;

//                if (dto.OverrideShiftId.HasValue && dto.OverrideShiftId.Value > 0)
//                {
//                    overrideData.CustomShift = true;
//                    overrideData.OverrideShiftId = dto.OverrideShiftId.Value;
//                }
//                else
//                {
//                    overrideData.CustomShift = true;
//                    overrideData.OverrideShiftId = null;

//                    var activeAssignments = await _context.EmployeeShiftAssignments
//                        .Where(a => a.Employee_Id == member.EmployeeId && a.IsActive)
//                        .ToListAsync();

//                    foreach (var a in activeAssignments)
//                    {
//                        a.IsActive = false;
//                        a.EffectiveTo = DateTime.Now;
//                        a.UpdatedDate = DateTime.Now;
//                    }
//                }

//                await _context.SaveChangesAsync();

//                var oldDays = await _context.TeamMemberReportingDays
//                    .Where(x => x.TeamMemberId == member.Id)
//                    .ToListAsync();

//                _context.TeamMemberReportingDays.RemoveRange(oldDays);

//                if (dto.CustomReportingDays && dto.ReportingDays != null)
//                {
//                    foreach (var day in dto.ReportingDays.Distinct())
//                    {
//                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
//                        {
//                            TeamMemberId = member.Id,
//                            DayName = day
//                        });
//                    }
//                }

//                await _context.SaveChangesAsync();

//                AttendanceService.ClearShiftCache(member.EmployeeId);

//                await _notificationService.CreateNotification(
//                    "Team Configuration Updated",
//                    "Your reporting configuration has been updated.");
//                try

//                {

//                    var result = await _fcmNotificationService.SendToEmployeeAsync(

//                        employeeId: member.EmployeeId,

//                        title: "Team Configuration Updated",

//                        body: "Your team reporting configuration, weekly offs, or shift settings have been updated.",

//                        type: "TEAM_CONFIGURATION_UPDATED",

//                        screen: "MyTeam",

//                        data: new Dictionary<string, string>

//                        {

//                            ["teamId"] = member.TeamId.ToString(),

//                            ["teamMemberId"] = member.Id.ToString(),

//                            ["employeeId"] = member.EmployeeId

//                        });

//                    Console.WriteLine(

//                        $"Team configuration FCM: Employee={member.EmployeeId}, " +

//                        $"Success={result.SuccessCount}, " +

//                        $"Failure={result.FailureCount}, " +

//                        $"Status={result.Status}");

//                }

//                catch (Exception ex)

//                {

//                    Console.WriteLine(

//                        $"Team configuration FCM failed for {member.EmployeeId}: {ex.Message}");

//                }

//                return new OkObjectResult("Member Override Updated Successfully.");

//            }

//            catch (Exception ex)

//            {

//                return new BadRequestObjectResult(ex.ToString());

//            }

//        }

//        // ==========================================
//        // EXPORT TEAMS (WEEKLY SHEETS)
//        // ==========================================
//        public async Task<IActionResult> ExportTeams(ClaimsPrincipal? user = null)
//        {
//            user ??= _httpContextAccessor.HttpContext?.User;
//            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

//            var query = _context.Teams
//                .Include(x => x.Members)
//                    .ThenInclude(m => m.Employee)
//                .AsNoTracking();

//            if (orgId.HasValue && orgId.Value > 0)
//            {
//                query = query.Where(x => x.OrganizationId == orgId.Value);
//            }
//            else if (adminIds != null && adminIds.Any())
//            {
//                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
//                    .Select(e => e.Employee_Id)
//                    .ToListAsync();

//                query = query.Where(x => tenantEmpIds.Contains(x.ReportingManagerId));
//            }

//            var teams = await query.OrderBy(x => x.TeamNumber).ToListAsync();

//            if (!teams.Any())
//                return new NotFoundObjectResult("No teams found.");

//            var teamIds = teams.Select(x => x.Id).ToList();

//            var reportingDayHistory = await _context.TeamReportingDays
//                .Where(x => teamIds.Contains(x.TeamId))
//                .AsNoTracking()
//                .OrderBy(x => x.TeamId)
//                .ThenBy(x => x.EffectiveFrom)
//                .ToListAsync();

//            var firstDate = reportingDayHistory
//                .Where(x => x.EffectiveFrom.HasValue && x.EffectiveFrom.Value >= new DateTime(2000, 1, 1))
//                .Select(x => x.EffectiveFrom!.Value.Date)
//                .DefaultIfEmpty(DateTime.Today)
//                .Min();

//            var lastDate = DateTime.Today;

//            using var workbook = new XLWorkbook();

//            var weekStart = firstDate;
//            while (weekStart.DayOfWeek != DayOfWeek.Monday)
//            {
//                weekStart = weekStart.AddDays(-1);
//            }

//            while (weekStart <= lastDate)
//            {
//                var weekEnd = weekStart.AddDays(6);
//                var displayWeekEnd = weekEnd > lastDate ? lastDate : weekEnd;

//                var sheetName = $"{weekStart:dd-MMM-yyyy} to {displayWeekEnd:dd-MMM-yyyy}";
//                if (sheetName.Length > 31)
//                    sheetName = sheetName.Substring(0, 31);

//                var baseSheetName = sheetName;
//                int suffix = 1;

//                while (workbook.Worksheets.Any(ws => string.Equals(ws.Name, sheetName, StringComparison.OrdinalIgnoreCase)))
//                {
//                    var suffixText = $" ({suffix++})";
//                    sheetName = baseSheetName.Substring(0, Math.Min(baseSheetName.Length, 31 - suffixText.Length)) + suffixText;
//                }

//                var worksheet = workbook.Worksheets.Add(sheetName);

//                worksheet.Cell(1, 1).Value = "Team No";
//                worksheet.Cell(1, 2).Value = "Team Name";
//                worksheet.Cell(1, 3).Value = "Reporting Days";
//                worksheet.Cell(1, 4).Value = "Employee ID";
//                worksheet.Cell(1, 5).Value = "Employee Name";

//                var header = worksheet.Range(1, 1, 1, 5);
//                header.Style.Font.Bold = true;
//                header.Style.Font.FontColor = XLColor.White;
//                header.Style.Fill.BackgroundColor = XLColor.DarkBlue;
//                header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
//                header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

//                int row = 2;
//                var teamColors = new[]
//                {
//                    XLColor.LightBlue,
//                    XLColor.LightGreen,
//                    XLColor.LightYellow,
//                    XLColor.LightPink,
//                    XLColor.LightCyan,
//                    XLColor.LightSalmon,
//                    XLColor.LightGray
//                };

//                int colorIndex = 0;

//                foreach (var team in teams)
//                {
//                    var teamHistory = reportingDayHistory
//                        .Where(x => x.TeamId == team.Id)
//                        .OrderBy(x => x.EffectiveFrom)
//                        .ToList();

//                    var activeHistory = teamHistory
//                        .Where(x =>
//                            x.EffectiveFrom <= displayWeekEnd.AddDays(1).AddTicks(-1) &&
//                            (x.EffectiveTo == null || x.EffectiveTo > weekStart))
//                        .ToList();

//                    var latestEffectiveFrom = activeHistory
//                        .Select(x => x.EffectiveFrom)
//                        .Distinct()
//                        .OrderByDescending(x => x)
//                        .FirstOrDefault();

//                    var reportingDays = activeHistory
//                        .Where(x => x.EffectiveFrom == latestEffectiveFrom && !string.Equals(x.DayName, "NONE", StringComparison.OrdinalIgnoreCase))
//                        .Select(x => GetShortDayName(x.DayName))
//                        .Distinct()
//                        .ToList();

//                    var reportingDaysText = string.Join(", ", reportingDays);

//                    var employees = team.Members
//                        .Where(m => m.Employee != null)
//                        .Select(m => new
//                        {
//                            EmployeeId = m.Employee!.Employee_Id,
//                            EmployeeName = m.Employee.Name
//                        })
//                        .Where(x => !string.IsNullOrWhiteSpace(x.EmployeeId) || !string.IsNullOrWhiteSpace(x.EmployeeName))
//                        .Distinct()
//                        .OrderBy(x => x.EmployeeName)
//                        .ToList();

//                    if (!employees.Any())
//                    {
//                        worksheet.Cell(row, 1).Value = team.TeamNumber ?? "";
//                        worksheet.Cell(row, 2).Value = team.TeamName ?? "";
//                        worksheet.Cell(row, 3).Value = reportingDaysText;
//                        worksheet.Cell(row, 4).Value = "";
//                        worksheet.Cell(row, 5).Value = "";

//                        var range = worksheet.Range(row, 1, row, 5);
//                        range.Style.Fill.BackgroundColor = teamColors[colorIndex % teamColors.Length];
//                        range.Style.Font.Bold = true;
//                        range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
//                        range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

//                        row++;
//                    }
//                    else
//                    {
//                        int startRow = row;
//                        foreach (var employee in employees)
//                        {
//                            worksheet.Cell(row, 1).Value = team.TeamNumber ?? "";
//                            worksheet.Cell(row, 2).Value = team.TeamName ?? "";
//                            worksheet.Cell(row, 3).Value = reportingDaysText;
//                            worksheet.Cell(row, 4).Value = employee.EmployeeId ?? "";
//                            worksheet.Cell(row, 5).Value = employee.EmployeeName ?? "";
//                            row++;
//                        }

//                        int endRow = row - 1;
//                        var teamRange = worksheet.Range(startRow, 1, endRow, 5);
//                        teamRange.Style.Fill.BackgroundColor = teamColors[colorIndex % teamColors.Length];
//                        teamRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
//                        teamRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
//                        worksheet.Range(startRow, 1, endRow, 3).Style.Font.Bold = true;
//                    }

//                    row += 2; // Blank row between teams
//                    colorIndex++;
//                }

//                worksheet.Column(1).Width = 15;
//                worksheet.Column(2).Width = 30;
//                worksheet.Column(3).Width = 35;
//                worksheet.Column(4).Width = 20;
//                worksheet.Column(5).Width = 30;

//                worksheet.RangeUsed().Style.Alignment.WrapText = true;
//                worksheet.RangeUsed().Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
//                worksheet.SheetView.FreezeRows(1);

//                weekStart = weekStart.AddDays(7);
//            }

//            using var stream = new MemoryStream();
//            workbook.SaveAs(stream);

//            return new FileContentResult(
//                stream.ToArray(),
//                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
//            {
//                FileDownloadName = $"Teams_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
//            };
//        }
//    }
//}

using ClosedXML.Excel;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using static QuestPDF.Helpers.Colors;

namespace EmployeeManagementSystem.Services
{
    public class TeamService : ITeamService
    {
        private static readonly string[] ValidWeekDays =
            { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };

        private static List<string> NormalizeWeeklyOffDays(IEnumerable<string>? days)
        {
            if (days == null)
                return new List<string> { "Saturday", "Sunday" };

            return days
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => ValidWeekDays.FirstOrDefault(d =>
                    d.Equals(x.Trim(), StringComparison.OrdinalIgnoreCase)))
                .Where(x => x != null)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Cast<string>()
                .ToList();
        }

        private static bool HasValidWeeklyOffDays(IEnumerable<string>? days)
        {
            if (days == null)
                return true;

            var values = days.Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
            return values.Count >= 1 &&
                   values.Count <= 6 &&
                   values.All(x => ValidWeekDays.Any(d =>
                       d.Equals(x.Trim(), StringComparison.OrdinalIgnoreCase)));
        }

        private static List<string> ParseWeeklyOffDays(string? days)
        {
            if (string.IsNullOrWhiteSpace(days))
                return new List<string> { "Saturday", "Sunday" };

            return NormalizeWeeklyOffDays(days.Split(',', StringSplitOptions.RemoveEmptyEntries));
        }


        private readonly AppDbContext _context;
        private readonly IAdminNotificationService _notificationService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IFcmNotificationService _fcmNotificationService;

        public TeamService(
            AppDbContext context,
            IAdminNotificationService notificationService,
            IHttpContextAccessor httpContextAccessor,
            IFcmNotificationService fcmNotificationService)
        {
            _context = context;
            _notificationService = notificationService;
            _httpContextAccessor = httpContextAccessor;
            _fcmNotificationService = fcmNotificationService;
        }

        // ==========================================
        // CREATE TEAM
        // ==========================================
        public async Task<IActionResult> CreateTeam(CreateTeamDto dto, ClaimsPrincipal? user = null)
        {
            if (dto == null)
                return new BadRequestObjectResult("Invalid team data.");

            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");

            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var teamNumber = dto.TeamNumber?.Trim() ?? "";

            // 1. VALIDATE TEAM NUMBER
            if (string.IsNullOrWhiteSpace(teamNumber))
                return new BadRequestObjectResult("Team Number is required.");

            // 2. VALIDATE REPORTING MANAGER
            var manager = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.ReportingManagerId);

            if (manager == null)
            {
                return new BadRequestObjectResult("Reporting Manager not found.");
            }

            // 3. GET PROJECT (OPTIONAL FOR TRAINING)
            Project? project = null;
            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                project = await _context.Projects
                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

                if (project == null)
                {
                    return new BadRequestObjectResult("Project not found.");
                }

                // 4. CHECK WHETHER TEAM ALREADY EXISTS FOR THIS PROJECT
                var existingTeam = await _context.Teams
                    .FirstOrDefaultAsync(x => x.ProjectId == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

                if (existingTeam != null)
                {
                    return new BadRequestObjectResult($"A team already exists for project '{project.Project_Name}'.");
                }
            }

            var effectiveOrgId = orgId ?? manager.OrganizationId ?? project?.OrganizationId;
            if (!effectiveOrgId.HasValue || effectiveOrgId.Value <= 0)
            {
                return new BadRequestObjectResult("Organization context is required to create a team.");
            }

            if (await _context.Teams.AnyAsync(x => x.OrganizationId == effectiveOrgId.Value && x.TeamNumber == teamNumber))
            {
                return new BadRequestObjectResult("Team Number already exists.");
            }

            // 5. DETERMINE TEAM NAME
            string resolvedTeamName = !string.IsNullOrWhiteSpace(dto.TeamName)
                ? dto.TeamName.Trim()
                : (project?.Project_Name ?? "Training Team");

            // 6. CREATE TEAM
            var team = new Team
            {
                OrganizationId = effectiveOrgId.Value,
                TeamNumber = teamNumber,
                TeamName = resolvedTeamName,
                ReportingManagerId = dto.ReportingManagerId,
                EngagementType = dto.EngagementType,
                ProjectId = dto.ProjectId.HasValue && dto.ProjectId.Value > 0 ? dto.ProjectId : null,
                ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null,
                WeeklyOffDays = string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays)),
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync();

            // 7. SAVE REPORTING DAYS (WITH EFFECTIVE DATES)
            var now = DateTime.Now;
            foreach (var day in dto.ReportingDays.Distinct())
            {
                _context.TeamReportingDays.Add(new TeamReportingDay
                {
                    TeamId = team.Id,
                    DayName = day,
                    EffectiveFrom = now,
                    EffectiveTo = null
                });
            }

            // 8. RESOLVE MEMBERS TO ADD
            var projectMembers = dto.ProjectId.HasValue && dto.ProjectId.Value > 0
                ? await _context.ProjectTeamMembers
                    .Where(x => x.ProjectId == dto.ProjectId.Value)
                    .Select(x => x.EmployeeId)
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            var membersToAdd = projectMembers.Any()
                ? projectMembers
                : dto.EmployeeIds
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList();

            // 9. ADD MEMBERS TO TEAM (Default: No Shift for newly added members)
            foreach (var employeeId in membersToAdd)
            {
                var employeeExists = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                    .AnyAsync(x => x.Employee_Id == employeeId);

                if (!employeeExists)
                {
                    return new BadRequestObjectResult($"Employee '{employeeId}' does not exist.");
                }

                var tm = new TeamMember
                {
                    TeamId = team.Id,
                    EmployeeId = employeeId
                };
                _context.TeamMembers.Add(tm);
                await _context.SaveChangesAsync();

                // Ensure newly added employee does NOT inherit team's shift by default (Scenario B: No Shift)
                _context.TeamMemberOverrides.Add(new TeamMemberOverride
                {
                    TeamMemberId = tm.Id,
                    CustomShift = true,
                    OverrideShiftId = null
                });

                // Assign team's reporting days to this newly added member
                foreach (var day in dto.ReportingDays
                             .Where(x => !string.IsNullOrWhiteSpace(x))
                             .Distinct(StringComparer.OrdinalIgnoreCase))
                {
                    _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                    {
                        TeamMemberId = tm.Id,
                        DayName = day
                    });
                }
            }

            await _context.SaveChangesAsync();

            foreach (var employeeId in membersToAdd.Distinct())

            {

                var employee = await _context.Employees

                    .AsNoTracking()

                    .FirstOrDefaultAsync(e => e.Employee_Id == employeeId);

                if (employee == null)

                    continue;

                try

                {


                    var fcmResult = await _fcmNotificationService.SendToEmployeeAsync(

                        employeeId: employee.Employee_Id,

                        title: "Added to new team",

                        body: $"You have been assigned to team '{team.TeamName}'.",

                        type: "TEAM_ASSIGNED",

                        screen: "MyTeam",

                        data: new Dictionary<string, string>

                        {

                            ["teamId"] = team.Id.ToString()

                        });

                    Console.WriteLine(

                        $"FCM result for {employee.Employee_Id}: " +

                        $"Devices={fcmResult.DevicesFound}, " +

                        $"Success={fcmResult.SuccessCount}, " +

                        $"Failure={fcmResult.FailureCount}, " +

                        $"Status={fcmResult.Status}");


                }

                catch (Exception ex)

                {

                    // Push notification failure must not undo team creation.

                    Console.WriteLine(

                        $"FCM notification failed for employee {employee.Employee_Id}: {ex.Message}");

                }

            }




            return new OkObjectResult(new
            {
                Message = "Team Created Successfully.",
                TeamId = team.Id,
                TeamName = team.TeamName,
                ProjectId = team.ProjectId,
                ProjectName = project?.Project_Name,
                MemberCount = membersToAdd.Count
            });
        }

        // ==========================================
        // GET TEAMS
        // ==========================================
        public async Task<IActionResult> GetTeams(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.Teams
                .Include(x => x.Project)
                .Include(x => x.ReportingManager)
                .Include(x => x.Shift)
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }
            else if (adminIds != null && adminIds.Any())
            {
                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
                    .Select(e => e.Employee_Id)
                    .ToListAsync();

                query = query.Where(x => tenantEmpIds.Contains(x.ReportingManagerId));
            }
            else
            {
                return new OkObjectResult(new List<TeamListDto>());
            }

            var teams = await query.ToListAsync();

            if (!teams.Any())
                return new OkObjectResult(new List<TeamListDto>());

            var teamIds = teams.Select(x => x.Id).ToList();

            // Get complete reporting-day history for timeline
            var reportingDayHistory = await _context.TeamReportingDays
                .Where(x => teamIds.Contains(x.TeamId))
                .AsNoTracking()
                .OrderBy(x => x.TeamId)
                .ThenBy(x => x.EffectiveFrom)
                .ToListAsync();

            var result = teams.Select(x =>
            {
                var teamReportingDays = reportingDayHistory
                    .Where(d =>
                        d.TeamId == x.Id &&
                        (d.EffectiveTo == null || d.EffectiveTo > DateTime.Now) &&
                        !string.Equals(d.DayName, "NONE", StringComparison.OrdinalIgnoreCase))
                    .Select(d => new ReportingDayDto
                    {
                        DayName = GetShortDayName(d.DayName),
                        EffectiveFrom = d.EffectiveFrom,
                        EffectiveTo = d.EffectiveTo,
                        ActualDates = GetActualReportingDates(
                            d.DayName,
                            d.EffectiveFrom ?? DateTime.MinValue,
                            d.EffectiveTo)
                    })
                    .ToList();

                return new TeamListDto
                {
                    TeamId = x.Id,
                    TeamNumber = x.TeamNumber,
                    TeamName = x.TeamName,
                    ProjectName = x.Project?.Project_Name,
                    ManagerName = x.ReportingManager?.Name,
                    EngagementType = x.EngagementType,
                    ShiftId = x.ShiftId,
                    ShiftName = x.Shift?.ShiftName,
                    WeeklyOffDays = ParseWeeklyOffDays(x.WeeklyOffDays),
                    EmployeeNames = x.Members.Where(m => m.Employee != null).Select(m => m.Employee.Name).ToList(),
                    Members = x.Members.Where(m => m.Employee != null).Select(m => new TeamMemberSummaryDto
                    {
                        EmployeeId = m.Employee.Employee_Id,
                        Name = m.Employee.Name
                    }).ToList(),
                    ReportingDays = teamReportingDays
                };
            }).ToList();

            return new OkObjectResult(result);
        }

        // ==========================================
        // GET PROJECT TEAMS
        // ==========================================
        public async Task<IActionResult> GetProjectTeams(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var projectQuery = _context.Projects.AsNoTracking();
            var teamQuery = _context.Teams.AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                projectQuery = projectQuery.Where(p => p.OrganizationId == orgId.Value);
                teamQuery = teamQuery.Where(t => t.OrganizationId == orgId.Value);
            }
            else if (adminIds != null && adminIds.Any())
            {
                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
                    .Select(e => e.Employee_Id)
                    .ToListAsync();

                teamQuery = teamQuery.Where(t => tenantEmpIds.Contains(t.ReportingManagerId));
            }
            else
            {
                return new OkObjectResult(new List<object>());
            }

            var projects = await projectQuery
                .Select(p => new
                {
                    ProjectId = p.Id,
                    ProjectName = p.Project_Name
                })
                .ToListAsync();

            var teams = await teamQuery
                .Select(t => new
                {
                    TeamId = t.Id,
                    t.ProjectId,
                    t.TeamNumber,
                    t.TeamName,
                    t.ReportingManagerId,
                    t.EngagementType,
                    t.IsActive
                })
                .ToListAsync();

            var result = projects
                .Select(project =>
                {
                    var team = teams.FirstOrDefault(t => t.ProjectId == project.ProjectId);

                    return new
                    {
                        project.ProjectId,
                        project.ProjectName,
                        TeamExists = team != null,
                        TeamId = team?.TeamId,
                        TeamNumber = team?.TeamNumber,
                        TeamName = team?.TeamName ?? project.ProjectName,
                        ReportingManagerId = team?.ReportingManagerId,
                        EngagementType = team?.EngagementType,
                        IsActive = team?.IsActive ?? true
                    };
                })
                .OrderBy(x => x.ProjectName)
                .ToList();

            return new OkObjectResult(result);
        }

        // ==========================================
        // HELPERS
        // ==========================================
        private static string GetShortDayName(string day)
        {
            return day switch
            {
                "Monday" => "Mon",
                "Tuesday" => "Tue",
                "Wednesday" => "Wed",
                "Thursday" => "Thu",
                "Friday" => "Fri",
                "Saturday" => "Sat",
                "Sunday" => "Sun",
                _ => day
            };
        }

        private static List<DateTime> GetActualReportingDates(
            string dayName,
            DateTime effectiveFrom,
            DateTime? effectiveTo)
        {
            var targetDay = dayName.Trim().ToLowerInvariant() switch
            {
                "monday" or "mon" => DayOfWeek.Monday,
                "tuesday" or "tue" => DayOfWeek.Tuesday,
                "wednesday" or "wed" => DayOfWeek.Wednesday,
                "thursday" or "thu" => DayOfWeek.Thursday,
                "friday" or "fri" => DayOfWeek.Friday,
                "saturday" or "sat" => DayOfWeek.Saturday,
                "sunday" or "sun" => DayOfWeek.Sunday,
                _ => DayOfWeek.Monday
            };

            var startDate = effectiveFrom.Date;
            var endDate = effectiveTo?.Date ?? DateTime.Today;
            var dates = new List<DateTime>();

            if (endDate < startDate)
                return dates;

            var daysUntilTarget = ((int)targetDay - (int)startDate.DayOfWeek + 7) % 7;
            var actualDate = startDate.AddDays(daysUntilTarget);

            while (actualDate <= endDate)
            {
                dates.Add(actualDate);
                actualDate = actualDate.AddDays(7);
            }

            return dates;
        }

        private List<string> GetComplementDays(List<string> wfoDays)
        {
            var allDays = new List<string>
            {
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri"
            };

            return allDays
                .Except(wfoDays)
                .ToList();
        }

        // ==========================================
        // GET TEAM DETAILS
        // ==========================================
        public async Task<IActionResult> GetTeamDetails(int teamId, ClaimsPrincipal? user = null, DateTime? date = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var team = await _context.Teams
                .Include(x => x.Project)
                .Include(x => x.ReportingManager)
                .Include(x => x.ReportingDays)
                .Include(x => x.Shift)
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == teamId);

            if (team == null)
            {
                return new NotFoundObjectResult("Team Not Found.");
            }

            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
            {
                return new NotFoundObjectResult("Team Not Found.");
            }

            var memberIds = team.Members?
                .Select(m => m.Id)
                .ToList() ?? new List<int>();

            var memberEmployeeIds = team.Members?
                .Where(m => m.Employee != null)
                .Select(m => m.Employee.Employee_Id)
                .Distinct()
                .ToList() ?? new List<string>();

            var targetDate = date?.Date ?? DateTime.Today;

            var effectiveOrgId = orgId ?? team.OrganizationId;
            var allShifts = await _context.ShiftMasters
                .Where(s => !effectiveOrgId.HasValue || s.OrganizationId == effectiveOrgId.Value)
                .AsNoTracking()
                .ToListAsync();

            var rostersToday = await _context.ShiftRosters
                .Where(r => memberEmployeeIds.Contains(r.Employee_Id) && r.RosterDate.Date == targetDate)
                .AsNoTracking()
                .ToListAsync();

            var assignments = await _context.EmployeeShiftAssignments
                .Include(a => a.Shift)
                .Where(a => memberEmployeeIds.Contains(a.Employee_Id) && a.IsActive)
                .AsNoTracking()
                .ToListAsync();

            var overrides = await _context.TeamMemberOverrides
                .Include(x => x.OverrideProject)
                .Include(x => x.OverrideShift)
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            var overrideDays = await _context.TeamMemberReportingDays
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            var technologyLookup = await _context.ProjectTeamMembers
                .AsNoTracking()
                .Where(x => x.ProjectId == team.ProjectId && memberEmployeeIds.Contains(x.EmployeeId))
                .GroupBy(x => x.EmployeeId)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.Select(x => x.Technology).FirstOrDefault());

            // 1. Check for explicit week-specific override (where EffectiveTo != null) covering targetDate
            var weekOverrideDays = team.ReportingDays != null
                ? team.ReportingDays
                    .Where(d => d.EffectiveTo != null &&
                                (targetDate < DateTime.Today || d.EffectiveTo > DateTime.Now) &&
                                d.EffectiveFrom.HasValue &&
                                d.EffectiveFrom.Value.Date <= targetDate &&
                                d.EffectiveTo.Value.Date >= targetDate)
                    .Select(d => GetShortDayName(d.DayName))
                    .Distinct()
                    .ToList()
                : new List<string>();

            // 2. If no week-specific override, fall back to open-ended baseline default
            var activeTeamDays = weekOverrideDays.Any()
                ? weekOverrideDays
                : (team.ReportingDays != null
                    ? team.ReportingDays
                        .Where(d => d.EffectiveTo == null)
                        .Select(d => GetShortDayName(d.DayName))
                        .Distinct()
                        .ToList()
                    : new List<string>());

            var dto = new TeamDetailDto
            {
                TeamId = team.Id,
                TeamNumber = team.TeamNumber,
                TeamName = team.TeamName,
                ProjectId = team.ProjectId,
                ProjectName = team.Project?.Project_Name ?? "",
                ReportingManagerId = team.ReportingManagerId,
                ReportingManager = team.ReportingManager?.Name ?? "",
                EngagementType = team.EngagementType,
                ShiftId = team.ShiftId,
                ShiftName = team.Shift?.ShiftName,
                ReportingDays = activeTeamDays,
                WeeklyOffDays = ParseWeeklyOffDays(team.WeeklyOffDays),

                Members = (team.Members ?? new List<TeamMember>()).Select(x =>
                {
                    var empId = x.Employee?.Employee_Id ?? x.EmployeeId ?? "";
                    var roster = rostersToday.FirstOrDefault(r => r.Employee_Id == empId);
                    var memberOverride = overrides.FirstOrDefault(o => o.TeamMemberId == x.Id);

                    int? effectiveShiftId;
                    string? effectiveShiftName;

                    bool hasExplicitCustomShift = memberOverride != null && memberOverride.CustomShift;

                    if (hasExplicitCustomShift)
                    {
                        // Explicit override (either assigned shift or unassigned/null)
                        effectiveShiftId = memberOverride!.OverrideShiftId;
                        effectiveShiftName = memberOverride.OverrideShiftId.HasValue
                            ? (memberOverride.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == memberOverride.OverrideShiftId.Value)?.ShiftName)
                            : null;
                    }
                    else
                    {
                        // Inherit daily roster if present, otherwise team default shift
                        effectiveShiftId = roster?.ShiftId ?? team.ShiftId;
                        effectiveShiftName = (roster != null
                            ? allShifts.FirstOrDefault(s => s.ShiftId == roster.ShiftId)?.ShiftName
                            : null)
                            ?? team.Shift?.ShiftName;
                    }

                    var memberOverrideDays = overrideDays
                        .Where(r => r.TeamMemberId == x.Id)
                        .Select(r => GetShortDayName(r.DayName))
                        .Distinct()
                        .ToList();

                    var shortDays = (memberOverride != null && memberOverride.CustomReportingDays && memberOverrideDays.Any())
                        ? memberOverrideDays
                        : activeTeamDays;

                    var wfhDays = GetComplementDays(shortDays);

                    return new TeamMemberDto
                    {
                        TeamMemberId = x.Id,
                        EmployeeId = empId,
                        EmployeeName = x.Employee?.Name ?? "",
                        Name = x.Employee?.Name ?? "",
                        Email = x.Employee?.Email ?? "",
                        Role = x.Employee?.RoleName ?? "",
                        Technology = technologyLookup.TryGetValue(empId, out var tech) ? tech : null,
                        ProjectName = memberOverride != null && memberOverride.DifferentProject && memberOverride.OverrideProject != null
                            ? memberOverride.OverrideProject.Project_Name
                            : (team.Project?.Project_Name ?? ""),
                        OverrideProjectId = memberOverride?.OverrideProjectId,
                        OverrideProjectName = memberOverride?.OverrideProject?.Project_Name ?? "",
                        CustomShift = hasExplicitCustomShift,
                        ShiftId = effectiveShiftId,
                        ShiftName = effectiveShiftName,
                        OverrideShiftId = hasExplicitCustomShift ? memberOverride!.OverrideShiftId : null,
                        OverrideShiftName = hasExplicitCustomShift ? effectiveShiftName : null,
                        CrossTeam = memberOverride?.DifferentProject ?? false,
                        CustomReportingDays = memberOverride?.CustomReportingDays ?? false,
                        CustomWeeklyOffDays = memberOverride?.CustomWeeklyOffDays ?? false,
                        OverrideWeeklyOffDays = string.IsNullOrWhiteSpace(memberOverride?.OverrideWeeklyOffDays)
                            ? new List<string>()
                            : ParseWeeklyOffDays(memberOverride.OverrideWeeklyOffDays),
                        OverrideWfoDays = shortDays,
                        OverrideWfhDays = wfhDays
                    };
                }).ToList()
            };

            return new OkObjectResult(dto);
        }

        // ==========================================
        // UPDATE TEAM
        // ==========================================
        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto, ClaimsPrincipal? user = null)
        {
            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
                return new NotFoundObjectResult("Team not found.");

            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
                return new NotFoundObjectResult("Team not found.");

            // Capture original values before changing the tracked entity.
            var oldTeamName = team.TeamName;
            var oldManagerId = team.ReportingManagerId;
            var oldProjectId = team.ProjectId;
            var oldEngagementType = team.EngagementType;
            var oldShiftId = team.ShiftId;
            var oldTeamNumber = team.TeamNumber;
            var oldWeeklyOffDays = team.WeeklyOffDays;

            // Validate Reporting Manager
            var manager = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.ReportingManagerId);

            if (manager == null)
                return new BadRequestObjectResult("Reporting Manager not found.");

            // Validate Project (optional for Training teams)
            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                var project = await _context.Projects
                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value && (!orgId.HasValue || x.OrganizationId == orgId.Value));

                if (project == null)
                    return new BadRequestObjectResult("Project not found.");

                team.ProjectId = dto.ProjectId.Value;
            }
            else
            {
                team.ProjectId = null;
            }

            if (orgId.HasValue && (!team.OrganizationId.HasValue || team.OrganizationId.Value == 0))
            {
                team.OrganizationId = orgId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.TeamNumber))
            {
                var trimmedTeamNumber = dto.TeamNumber.Trim().ToUpper();
                if (!string.Equals(team.TeamNumber, trimmedTeamNumber, StringComparison.OrdinalIgnoreCase))
                {
                    var exists = await _context.Teams.AnyAsync(x => x.Id != team.Id && x.TeamNumber == trimmedTeamNumber && (!orgId.HasValue || x.OrganizationId == orgId.Value));
                    if (exists)
                        return new BadRequestObjectResult("Team Number already exists.");
                    team.TeamNumber = trimmedTeamNumber;
                }
            }

            team.TeamName = dto.TeamName;
            team.ReportingManagerId = dto.ReportingManagerId;
            team.EngagementType = dto.EngagementType;
            team.ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null;
            if (dto.WeeklyOffDays != null)
                team.WeeklyOffDays = string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays));

            // Update Reporting Days
            var oldDays = await _context.TeamReportingDays
                .Where(x => x.TeamId == dto.TeamId)
                .ToListAsync();

            var oldReportingDayNames = oldDays
                .Where(x => !string.IsNullOrWhiteSpace(x.DayName))
                .Select(x => x.DayName.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var requestedReportingDays = (dto.ReportingDays ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                .ToList();

            bool reportingDaysChanged = !oldReportingDayNames.SequenceEqual(
                requestedReportingDays, StringComparer.OrdinalIgnoreCase);

            _context.TeamReportingDays.RemoveRange(oldDays);

            var now = DateTime.Now;
            foreach (var day in requestedReportingDays)
            {
                _context.TeamReportingDays.Add(new TeamReportingDay
                {
                    TeamId = dto.TeamId,
                    DayName = day,
                    EffectiveFrom = now,
                    EffectiveTo = null
                });
            }

            // Update Members
            var oldMembers = await _context.TeamMembers
                .Where(x => x.TeamId == dto.TeamId)
                .ToListAsync();

            var oldMemberIds = oldMembers.Select(m => m.Id).ToList();
            var oldEmployeeIds = oldMembers
                .Select(m => m.EmployeeId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var newEmployeeIds = (dto.EmployeeIds ?? new List<string>())
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Select(id => id.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var addedEmployeeIds = newEmployeeIds
                .Except(oldEmployeeIds, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var removedEmployeeIds = oldEmployeeIds
                .Except(newEmployeeIds, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var existingOverrides = await _context.TeamMemberOverrides
                .Where(o => oldMemberIds.Contains(o.TeamMemberId))
                .ToListAsync();

            _context.TeamMembers.RemoveRange(oldMembers);
            await _context.SaveChangesAsync();

            foreach (var emp in newEmployeeIds)
            {
                var employee = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

                if (employee == null)
                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

                var newTm = new TeamMember
                {
                    TeamId = dto.TeamId,
                    EmployeeId = emp
                };
                _context.TeamMembers.Add(newTm);
                await _context.SaveChangesAsync();

                var oldTm = oldMembers.FirstOrDefault(m => m.EmployeeId == emp);
                bool isExistingMember = oldTm != null;

                if (isExistingMember)
                {
                    // Scenario C: Existing members inherit team's new shift!
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = newTm.Id,
                        CustomShift = false, // Inherits team's new shift
                        OverrideShiftId = null
                    });
                }
                else
                {
                    // Scenario B: Newly added members get No Shift (unassigned), but inherit team reporting days
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = newTm.Id,
                        CustomShift = true, // Explicitly blocks team shift
                        OverrideShiftId = null // Unassigned
                    });

                    foreach (var day in requestedReportingDays)
                    {
                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                        {
                            TeamMemberId = newTm.Id,
                            DayName = day
                        });
                    }
                }
            }

            await _context.SaveChangesAsync();

            // Clear attendance shift cache for all members so new shift applies immediately
            foreach (var employeeId in newEmployeeIds.Concat(removedEmployeeIds)

               .Distinct(StringComparer.OrdinalIgnoreCase))

            {

                AttendanceService.ClearShiftCache(employeeId);

            }

            // Detect actual team detail changes.

            bool teamDetailsChanged =

                 oldTeamName != team.TeamName ||

                 oldManagerId != team.ReportingManagerId ||

                 oldProjectId != team.ProjectId ||

                 oldEngagementType != team.EngagementType ||

                 oldShiftId != team.ShiftId ||

                 oldTeamNumber != team.TeamNumber ||

                 oldWeeklyOffDays != team.WeeklyOffDays ||

                 reportingDaysChanged;

            bool membershipChanged =

                 addedEmployeeIds.Any() || removedEmployeeIds.Any();

            // Send notifications after successful database saves.

            if (teamDetailsChanged || membershipChanged)

            {

                // Notify employees who are currently in this team.

                foreach (var employeeId in newEmployeeIds)

                {

                    bool isNewMember = addedEmployeeIds.Contains(

                        employeeId,

                        StringComparer.OrdinalIgnoreCase);

                    try

                    {

                        var result = await _fcmNotificationService.SendToEmployeeAsync(

                            employeeId: employeeId,

                            title: isNewMember

                                ? "Team Assignment"

                                : "Team Updated",

                            body: isNewMember

                                ? $"You have been assigned to team '{team.TeamName}'."

                                : $"Team '{team.TeamName}' details have been updated.",

                            type: isNewMember

                                ? "TEAM_ASSIGNED"

                                : "TEAM_UPDATED",

                            screen: "MyTeam",

                            data: new Dictionary<string, string>

                            {

                                ["teamId"] = team.Id.ToString()

                            });

                        Console.WriteLine(

                            $"Team update FCM: Employee={employeeId}, " +

                            $"Success={result.SuccessCount}, " +

                            $"Failure={result.FailureCount}, " +

                            $"Status={result.Status}");

                    }

                    catch (Exception ex)

                    {

                        Console.WriteLine(

                            $"Team update notification failed for {employeeId}: {ex.Message}");

                    }

                }

                // Notify employees who were removed from this team.

                foreach (var employeeId in removedEmployeeIds)

                {

                    try

                    {

                        var result = await _fcmNotificationService.SendToEmployeeAsync(

                            employeeId: employeeId,

                            title: "Team Membership Updated",

                            body: $"You have been removed from team '{team.TeamName}'.",

                            type: "TEAM_REMOVED",

                            screen: "MyTeam",

                            data: new Dictionary<string, string>

                            {

                                ["teamId"] = team.Id.ToString()

                            });

                        Console.WriteLine(

                            $"Team removal FCM: Employee={employeeId}, " +

                            $"Success={result.SuccessCount}, " +

                            $"Failure={result.FailureCount}, " +

                            $"Status={result.Status}");

                    }

                    catch (Exception ex)

                    {

                        Console.WriteLine(

                            $"Team removal notification failed for {employeeId}: {ex.Message}");

                    }

                }

            }


            return new OkObjectResult("Team Updated Successfully.");
        }

        // ==========================================
        // DELETE TEAM
        // ==========================================
        public async Task<IActionResult> DeleteTeam(int teamId, ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == teamId);

            if (team == null)
                return new NotFoundResult();

            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
                return new NotFoundResult();

            _context.Teams.Remove(team);
            await _context.SaveChangesAsync();

            return new NoContentResult();
        }

        // ==========================================
        // ADD MEMBERS
        // ==========================================
        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto, ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
                return new NotFoundObjectResult("Team not found.");

            if (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value)
                return new NotFoundObjectResult("Team not found.");

            var newlyAddedEmployeeIds = new List<string>();

            // Get active reporting days for this team
            var activeDays = await _context.TeamReportingDays
                .Where(d => d.TeamId == team.Id && d.EffectiveTo == null)
                .Select(d => d.DayName)
                .Distinct()
                .ToListAsync();

            foreach (var emp in dto.EmployeeIds.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
            {
                var employee = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

                if (employee == null)
                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

                var alreadyExists = await _context.TeamMembers
                    .AnyAsync(x => x.TeamId == team.Id && x.EmployeeId == emp);

                if (!alreadyExists)
                {
                    var tm = new TeamMember
                    {
                        TeamId = team.Id,
                        EmployeeId = emp
                    };
                    _context.TeamMembers.Add(tm);
                    await _context.SaveChangesAsync();

                    // Newly added member: No shift by default, gets team reporting days
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = tm.Id,
                        CustomShift = true,
                        OverrideShiftId = null
                    });

                    foreach (var day in activeDays)
                    {
                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                        {
                            TeamMemberId = tm.Id,
                            DayName = day
                        });
                    }

                    newlyAddedEmployeeIds.Add(emp);
                }
            }

            await _context.SaveChangesAsync();

            foreach (var employeeId in newlyAddedEmployeeIds)

            {

                try

                {

                    var result = await _fcmNotificationService.SendToEmployeeAsync(

                        employeeId: employeeId,

                        title: "Team Assignment",

                        body: $"You have been assigned to team '{team.TeamName}'.",

                        type: "TEAM_ASSIGNED",

                        screen: "MyTeam",

                        data: new Dictionary<string, string>

                        {

                            ["teamId"] = team.Id.ToString()

                        });

                    Console.WriteLine(

                        $"Team assignment FCM: Employee={employeeId}, " +

                        $"Success={result.SuccessCount}, " +

                        $"Failure={result.FailureCount}, " +

                        $"Status={result.Status}");

                }

                catch (Exception ex)

                {

                    // Notification failure must not undo the member assignment.

                    Console.WriteLine(

                        $"FCM failed for employee {employeeId}: {ex.Message}");

                }

            }


            return new OkObjectResult(new
            {
                Message = "Members Added Successfully.",
                NewlyAddedCount = newlyAddedEmployeeIds.Count
            });
        }

        // ==========================================
        // REMOVE MEMBER
        // ==========================================
        public async Task<IActionResult> RemoveMember(int teamId, string employeeId, ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var member = await _context.TeamMembers
                .Include(x => x.Team)
                .FirstOrDefaultAsync(x => x.TeamId == teamId && x.EmployeeId == employeeId);

            if (member == null)
                return new NotFoundObjectResult("Member not found.");

            if (orgId.HasValue && member.Team?.OrganizationId.HasValue == true && member.Team.OrganizationId.Value != orgId.Value)
                return new NotFoundObjectResult("Member not found.");

            _context.TeamMembers.Remove(member);
            await _context.SaveChangesAsync();
            AttendanceService.ClearShiftCache(employeeId);

            // Notify only the removed employee

            try

            {

                var result = await _fcmNotificationService.SendToEmployeeAsync(

                    employeeId: employeeId,

                    title: "Team Membership Updated",

                    body: $"You have been removed from team your team.",

                    type: "TEAM_REMOVED",

                    screen: "MyTeam",

                    data: new Dictionary<string, string>

                    {

                        ["teamId"] = teamId.ToString()

                    });

                Console.WriteLine(

                    $"Team removal FCM: Employee={employeeId}, " +

                    $"Success={result.SuccessCount}, " +

                    $"Failure={result.FailureCount}, " +

                    $"Status={result.Status}");

            }

            catch (Exception ex)

            {

                Console.WriteLine(

                    $"Team removal notification failed for {employeeId}: {ex.Message}");

            }

            return new OkObjectResult("Member Removed Successfully.");
        }

        // ==========================================
        // GET AVAILABLE EMPLOYEES
        // ==========================================
        public async Task<IActionResult> GetAvailableEmployees(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var assignedEmployees = await _context.TeamMembers
                .Where(x => x.Team != null && (!orgId.HasValue || x.Team.OrganizationId == orgId.Value))
                .Select(x => x.EmployeeId)
                .ToListAsync();

            var employees = await CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds)
                .Where(x => !assignedEmployees.Contains(x.Employee_Id) && x.RoleName != "Manager" && x.RoleName != "manager")
                .Select(x => new
                {
                    x.Employee_Id,
                    x.Name
                })
                .ToListAsync();

            return new OkObjectResult(employees);
        }

        // ==========================================
        // GET MANAGERS
        // ==========================================
        public async Task<IActionResult> GetManagers(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var databaseName = _context.Database.GetDbConnection().Database;
            var tenantEmployees = CurrentUserHelper.FilterEmployeesByTenant(_context, orgId, adminIds);

            var managers = await (
                from e in tenantEmployees
                join r in _context.Roles on e.RoleId equals r.RoleId into roleGroup
                from r in roleGroup.DefaultIfEmpty()
                where e.RoleName == "Manager" || e.RoleName == "manager" || (r != null && (r.Name == "Manager" || r.Name == "manager"))
                orderby e.Name
                select new
                {
                    e.Employee_Id,
                    e.Name,
                    e.Email,
                    RoleName = e.RoleName ?? (r != null ? r.Name : "Manager")
                })
                .AsNoTracking()
                .ToListAsync();

            return new OkObjectResult(new
            {
                database = databaseName,
                managers
            });
        }

        // ==========================================
        // UPDATE REPORTING DAYS (WITH TIMELINE SUPPORT)
        // ==========================================
        public async Task<IActionResult> UpdateTeamWeeklyOff(UpdateTeamWeeklyOffDto dto, ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.Teams.AsQueryable();
            if (orgId.HasValue)
                query = query.Where(t => t.OrganizationId == orgId.Value);

            var team = await query.FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
                return new NotFoundObjectResult("Team not found.");

            if (!HasValidWeeklyOffDays(dto.WeeklyOffDays))
                return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");

            var requestedDays = NormalizeWeeklyOffDays(dto.WeeklyOffDays);

            team.WeeklyOffDays = string.Join(",", requestedDays);
            await _context.SaveChangesAsync();

            return new OkObjectResult(new
            {
                Message = "Team weekly off days updated successfully.",
                TeamId = team.Id,
                WeeklyOffDays = requestedDays
            });
        }

        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto, ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null || (orgId.HasValue && team.OrganizationId.HasValue && team.OrganizationId.Value != orgId.Value))
            {
                return new NotFoundObjectResult("Team not found.");
            }

            var requestedDays = (dto.ReportingDays ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            bool isWeekScoped = dto.WeekStartDate.HasValue && dto.WeekEndDate.HasValue && !dto.IsDefaultAllWeeks;

            if (isWeekScoped)
            {
                var start = dto.WeekStartDate.Value.Date;
                var end = dto.WeekEndDate.Value.Date;

                // Remove existing override records specifically for this week window
                var existingWeekDays = await _context.TeamReportingDays
                    .Where(x => x.TeamId == dto.TeamId && x.EffectiveFrom.HasValue && x.EffectiveFrom.Value.Date == start && x.EffectiveTo.HasValue && x.EffectiveTo.Value.Date == end)
                    .ToListAsync();

                if (existingWeekDays.Any())
                {
                    _context.TeamReportingDays.RemoveRange(existingWeekDays);
                }

                // Save explicit empty override when no WFO days are selected
                if (!requestedDays.Any())
                {
                    _context.TeamReportingDays.Add(new TeamReportingDay
                    {
                        TeamId = dto.TeamId,
                        DayName = "NONE",
                        EffectiveFrom = start,
                        EffectiveTo = end
                    });
                }
                else
                {
                    foreach (var day in requestedDays)
                    {
                        _context.TeamReportingDays.Add(new TeamReportingDay
                        {
                            TeamId = dto.TeamId,
                            DayName = day,
                            EffectiveFrom = start,
                            EffectiveTo = end
                        });
                    }
                }

                // Reset custom reporting days overrides for all members in this team
                // so that every member inherits the newly updated team reporting days
                var teamMembers = await _context.TeamMembers
                    .Where(m => m.TeamId == dto.TeamId)
                    .ToListAsync();

                var memberIds = teamMembers.Select(m => m.Id).ToList();

                var memberOverrides = await _context.TeamMemberOverrides
                    .Where(o => memberIds.Contains(o.TeamMemberId) && o.CustomReportingDays)
                    .ToListAsync();

                foreach (var o in memberOverrides)
                {
                    o.CustomReportingDays = false;
                }

                var oldMemberDays = await _context.TeamMemberReportingDays
                    .Where(r => memberIds.Contains(r.TeamMemberId))
                    .ToListAsync();

                if (oldMemberDays.Any())
                {
                    _context.TeamMemberReportingDays.RemoveRange(oldMemberDays);
                }

                // If currently viewed date falls in this week, also synchronize member day records
                var today = DateTime.Today;
                if (today >= start && today <= end)
                {
                    foreach (var memberId in memberIds)
                    {
                        foreach (var day in requestedDays)
                        {
                            _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                            {
                                TeamMemberId = memberId,
                                DayName = day
                            });
                        }
                    }
                }

                await _context.SaveChangesAsync();
            }
            else
            {
                var now = DateTime.Now;

                // Get currently active baseline reporting days
                var currentDays = await _context.TeamReportingDays
                    .Where(x => x.TeamId == dto.TeamId && x.EffectiveTo == null)
                    .ToListAsync();

                var existingDays = currentDays
                    .Select(x => x.DayName.Trim().ToLowerInvariant())
                    .ToHashSet();

                var newDays = requestedDays
                    .Select(x => x.ToLowerInvariant())
                    .ToHashSet();

                if (existingDays.SetEquals(newDays))
                {
                    return new OkObjectResult("Reporting days are unchanged. No update or notification required.");
                }

                // Close old reporting days
                foreach (var oldDay in currentDays)
                {
                    oldDay.EffectiveTo = now;
                }

                // Add new reporting days
                foreach (var day in requestedDays)
                {
                    _context.TeamReportingDays.Add(new TeamReportingDay
                    {
                        TeamId = dto.TeamId,
                        DayName = day,
                        EffectiveFrom = now,
                        EffectiveTo = null
                    });
                }

                // Reset custom reporting days overrides for all members in this team
                var teamMembers = await _context.TeamMembers
                    .Where(m => m.TeamId == dto.TeamId)
                    .ToListAsync();

                var memberIds = teamMembers.Select(m => m.Id).ToList();

                var memberOverrides = await _context.TeamMemberOverrides
                    .Where(o => memberIds.Contains(o.TeamMemberId) && o.CustomReportingDays)
                    .ToListAsync();

                foreach (var o in memberOverrides)
                {
                    o.CustomReportingDays = false;
                }

                var oldMemberDays = await _context.TeamMemberReportingDays
                    .Where(r => memberIds.Contains(r.TeamMemberId))
                    .ToListAsync();

                if (oldMemberDays.Any())
                {
                    _context.TeamMemberReportingDays.RemoveRange(oldMemberDays);
                }

                foreach (var memberId in memberIds)
                {
                    foreach (var day in requestedDays)
                    {
                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                        {
                            TeamMemberId = memberId,
                            DayName = day
                        });
                    }
                }

                await _context.SaveChangesAsync();
            }

            try
            {
                await _notificationService.CreateNotification(
                    "Reporting Days Updated",
                    $"Reporting days updated to {string.Join(", ", requestedDays)}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Admin notification failed: {ex.Message}");
            }

            try

            {

                // Notify every employee who has an active registered FCM device.

                // Get only employees belonging to the updated team

                var teamEmployeeIds = await _context.TeamMembers

                    .Where(m => m.TeamId == dto.TeamId)

                    .Select(m => m.EmployeeId)

                    .Distinct()

                    .ToListAsync();

                // Get active FCM devices only for those team members

                var registeredEmployeeIds = await _context.UserNotificationDevices

                    .Where(d =>

                        d.IsActive &&

                        teamEmployeeIds.Contains(d.EmployeeId))

                    .Select(d => d.EmployeeId)

                    .Distinct()

                    .ToListAsync();


                var reportingDaysText = string.Join(

                    ", ",

                    dto.ReportingDays ?? new List<string>());

                foreach (var employeeId in registeredEmployeeIds)

                {

                    try

                    {

                        var result = await _fcmNotificationService.SendToEmployeeAsync(

                            employeeId: employeeId,

                            title: "Reporting Days Updated",

                            body: $"Team '{team.TeamName}' reporting days changed to: {reportingDaysText}.",

                            type: "REPORTING_DAYS_UPDATED",

                            screen: "MyTeam",

                            data: new Dictionary<string, string>

                            {

                                ["teamId"] = team.Id.ToString()

                            });

                        Console.WriteLine(

                            $"Reporting days FCM: Employee={employeeId}, " +

                            $"Success={result.SuccessCount}, " +

                            $"Failure={result.FailureCount}, " +

                            $"Status={result.Status}");

                    }

                    catch (Exception ex)

                    {

                        Console.WriteLine(

                            $"Reporting days notification failed for {employeeId}: {ex.Message}");

                    }

                }

            }

            catch (Exception ex)

            {

                // A notification failure must not undo the reporting-day update.

                Console.WriteLine(

                    $"Failed to retrieve registered devices: {ex.Message}");

            }


            return new OkObjectResult("Reporting Days Updated Successfully.");
        }

        // ==========================================
        // GET MY TEAM
        // ==========================================
        public async Task<IActionResult> GetMyTeam(ClaimsPrincipal? user = null, DateTime? date = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var employeeId =
                user?.FindFirst("EmployeeId")?.Value
                ?? user?.FindFirst("Employee_Id")?.Value
                ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return new UnauthorizedObjectResult(new { message = "Employee ID not found in JWT." });
            }

            var teamMember = await _context.TeamMembers
                .Include(tm => tm.TeamMemberOverride)
                    .ThenInclude(tmo => tmo.OverrideShift)
                .Include(tm => tm.TeamMemberOverride)
                    .ThenInclude(tmo => tmo.OverrideProject)
                .AsNoTracking()
                .FirstOrDefaultAsync(tm => tm.EmployeeId == employeeId);

            if (teamMember == null)
            {
                return new NotFoundObjectResult(new { message = "You are not assigned to any team." });
            }

            var team = await _context.Teams
                .Include(t => t.Shift)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == teamMember.TeamId && t.IsActive);

            if (team == null)
            {
                return new NotFoundObjectResult(new { message = "Your team was not found." });
            }

            var memberIds = await _context.TeamMembers
                .Where(tm => tm.TeamId == team.Id)
                .Select(tm => tm.Id)
                .ToListAsync();

            var overrides = await _context.TeamMemberOverrides
                .Include(x => x.OverrideShift)
                .Include(x => x.OverrideProject)
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            var overrideDays = await _context.TeamMemberReportingDays
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            var targetDate = date?.Date ?? DateTime.Today;

            var effectiveOrgId = orgId ?? team.OrganizationId;
            var allShifts = await _context.ShiftMasters
                .Where(s => !effectiveOrgId.HasValue || s.OrganizationId == effectiveOrgId.Value)
                .AsNoTracking()
                .ToListAsync();

            var rostersToday = await _context.ShiftRosters
                .Where(r => r.RosterDate.Date == targetDate)
                .AsNoTracking()
                .ToListAsync();

            // 1. Check for explicit week-specific override (where EffectiveTo != null) covering targetDate
            var weekOverrideDays = await _context.TeamReportingDays
                .AsNoTracking()
                .Where(rd => rd.TeamId == team.Id &&
                             rd.EffectiveTo != null &&
                             (targetDate < DateTime.Today || rd.EffectiveTo > DateTime.Now) &&
                             rd.EffectiveFrom.HasValue &&
                             rd.EffectiveFrom.Value.Date <= targetDate &&
                             rd.EffectiveTo.Value.Date >= targetDate)
                .Select(rd => GetShortDayName(rd.DayName))
                .Distinct()
                .ToListAsync();

            // 2. If no week-specific override, fall back to open-ended baseline default
            List<string> baseTeamReportingDays;
            if (weekOverrideDays.Any())
            {
                baseTeamReportingDays = weekOverrideDays;
            }
            else
            {
                baseTeamReportingDays = await _context.TeamReportingDays
                    .AsNoTracking()
                    .Where(rd => rd.TeamId == team.Id && rd.EffectiveTo == null)
                    .Select(rd => GetShortDayName(rd.DayName))
                    .Distinct()
                    .ToListAsync();
            }

            var members = await _context.TeamMembers
                .AsNoTracking()
                .Where(tm => tm.TeamId == team.Id)
                .Join(
                    _context.Employees,
                    tm => tm.EmployeeId,
                    e => e.Employee_Id,
                    (tm, e) => new
                    {
                        tm.Id,
                        EmployeeId = e.Employee_Id,
                        Name = e.Name,
                        Role = e.RoleName ?? ""
                    })
                .ToListAsync();

            var memberEmployeeIds = members.Select(m => m.EmployeeId).Distinct().ToList();

            var technologyLookup = await _context.ProjectTeamMembers
                .AsNoTracking()
                .Where(x => x.ProjectId == team.ProjectId && memberEmployeeIds.Contains(x.EmployeeId))
                .GroupBy(x => x.EmployeeId)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.Select(x => x.Technology).FirstOrDefault());

            var memberDtos = members.Select(m =>
            {
                var mo = overrides.FirstOrDefault(o => o.TeamMemberId == m.Id);
                var memberRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == m.EmployeeId);

                bool hasExplicitCustomShift = mo != null && mo.CustomShift;
                int? effectiveId;
                string? effectiveName;

                if (hasExplicitCustomShift)
                {
                    effectiveId = mo!.OverrideShiftId;
                    effectiveName = mo.OverrideShiftId.HasValue
                        ? (mo.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == mo.OverrideShiftId.Value)?.ShiftName)
                        : null;
                }
                else
                {
                    effectiveId = memberRoster?.ShiftId ?? team.ShiftId;
                    effectiveName = (memberRoster != null ? allShifts.FirstOrDefault(s => s.ShiftId == memberRoster.ShiftId)?.ShiftName : null)
                        ?? team.Shift?.ShiftName;
                }

                var memberShortDays = overrideDays
                    .Where(r => r.TeamMemberId == m.Id)
                    .Select(r => GetShortDayName(r.DayName))
                    .Distinct()
                    .ToList();

                var shortDays = (mo != null && mo.CustomReportingDays && memberShortDays.Any())
                    ? memberShortDays
                    : baseTeamReportingDays;

                var memberWfhDays = shortDays.Any()
                    ? GetComplementDays(shortDays)
                    : new List<string>();

                return new
                {
                    teamMemberId = m.Id,
                    employeeId = m.EmployeeId,
                    name = m.Name,
                    role = m.Role,
                    technology = technologyLookup.TryGetValue(m.EmployeeId, out var tech) ? tech : null,
                    projectName = mo != null && mo.DifferentProject && mo.OverrideProject != null
                        ? mo.OverrideProject.Project_Name
                        : "",
                    overrideProjectId = mo?.OverrideProjectId,
                    overrideProjectName = mo?.OverrideProject?.Project_Name ?? "",
                    customShift = hasExplicitCustomShift,
                    shiftId = effectiveId,
                    shiftName = effectiveName,
                    overrideShiftId = (hasExplicitCustomShift && mo!.OverrideShiftId.HasValue) ? mo.OverrideShiftId : null,
                    overrideShiftName = (hasExplicitCustomShift && mo!.OverrideShiftId.HasValue)
                        ? (mo.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == mo.OverrideShiftId.Value)?.ShiftName)
                        : null,
                    crossTeam = mo?.DifferentProject ?? false,
                    customReportingDays = mo?.CustomReportingDays ?? false,
                    customWeeklyOffDays = mo?.CustomWeeklyOffDays ?? false,
                    overrideWeeklyOffDays = string.IsNullOrWhiteSpace(mo?.OverrideWeeklyOffDays)
                        ? new List<string>()
                        : ParseWeeklyOffDays(mo.OverrideWeeklyOffDays),
                    overrideWfoDays = shortDays,
                    overrideWfhDays = memberWfhDays
                };
            }).ToList();

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == team.ProjectId);

            var myOverride = teamMember.TeamMemberOverride;
            var myOverrideDays = overrideDays
                .Where(r => r.TeamMemberId == teamMember.Id)
                .Select(r => GetShortDayName(r.DayName))
                .Distinct()
                .ToList();

            var effectiveReportingDays = (myOverride != null && myOverride.CustomReportingDays && myOverrideDays.Any())
                ? myOverrideDays
                : baseTeamReportingDays;

            bool myExplicitCustomShift = myOverride != null && myOverride.CustomShift;
            int? myEffectiveShiftId;
            string? myEffectiveShiftName;

            if (myExplicitCustomShift)
            {
                myEffectiveShiftId = myOverride!.OverrideShiftId;
                myEffectiveShiftName = myOverride.OverrideShiftId.HasValue
                    ? (myOverride.OverrideShift?.ShiftName ?? allShifts.FirstOrDefault(s => s.ShiftId == myOverride.OverrideShiftId.Value)?.ShiftName)
                    : null;
            }
            else
            {
                var myRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == employeeId);
                myEffectiveShiftId = myRoster?.ShiftId ?? team.ShiftId;
                myEffectiveShiftName = (myRoster != null ? allShifts.FirstOrDefault(s => s.ShiftId == myRoster.ShiftId)?.ShiftName : null)
                    ?? team.Shift?.ShiftName;
            }

            return new OkObjectResult(new
            {
                teamId = team.Id,
                teamNumber = team.TeamNumber,
                teamName = team.TeamName,
                projectId = team.ProjectId,
                projectName = project?.Project_Name,
                reportingManagerId = team.ReportingManagerId,
                reportingManager = team.ReportingManager?.Name,
                engagementType = team.EngagementType,
                shiftId = myEffectiveShiftId,
                shiftName = myEffectiveShiftName,
                myShiftId = myEffectiveShiftId,
                myShiftName = myEffectiveShiftName,
                teamShiftId = team.ShiftId,
                teamShiftName = team.Shift?.ShiftName,
                reportingDays = effectiveReportingDays,
                weeklyOffDays = ParseWeeklyOffDays(team.WeeklyOffDays),
                members = memberDtos
            });
        }

        // ==========================================
        // MEMBER OVERRIDE
        // ==========================================
        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto, ClaimsPrincipal? user = null)
        {
            try
            {
                if (dto.CustomWeeklyOffDays && (dto.WeeklyOffDays == null || !HasValidWeeklyOffDays(dto.WeeklyOffDays)))
                    return new BadRequestObjectResult("Select between 1 and 6 valid weekly off days.");
                user ??= _httpContextAccessor.HttpContext?.User;
                var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

                TeamMember? member = null;
                if (dto.TeamMemberId > 0)
                {
                    member = await _context.TeamMembers
                        .Include(x => x.Team)
                        .Include(x => x.Employee)
                        .FirstOrDefaultAsync(x => x.Id == dto.TeamMemberId);
                }

                if (member == null && !string.IsNullOrWhiteSpace(dto.EmployeeId))
                {
                    var empId = dto.EmployeeId.Trim();
                    if (dto.TeamId > 0)
                    {
                        member = await _context.TeamMembers
                            .Include(x => x.Team)
                            .Include(x => x.Employee)
                            .FirstOrDefaultAsync(x => x.TeamId == dto.TeamId && x.EmployeeId == empId);
                    }
                    if (member == null)
                    {
                        member = await _context.TeamMembers
                            .Include(x => x.Team)
                            .Include(x => x.Employee)
                            .FirstOrDefaultAsync(x => x.EmployeeId == empId);
                    }
                }

                if (member == null)
                    return new NotFoundObjectResult(new
                    {
                        message = "Team Member not found.",
                        teamMemberId = dto.TeamMemberId,
                        teamId = dto.TeamId,
                        employeeId = dto.EmployeeId
                    });

                if (orgId.HasValue)
                {
                    if (member.Team?.OrganizationId.HasValue == true && member.Team.OrganizationId.Value != orgId.Value)
                        return new NotFoundObjectResult("Team Member not found.");
                    if (member.Employee?.OrganizationId.HasValue == true && member.Employee.OrganizationId.Value != orgId.Value)
                        return new NotFoundObjectResult("Team Member not found.");
                }

                var overrideData = await _context.TeamMemberOverrides
                    .FirstOrDefaultAsync(x => x.TeamMemberId == member.Id);

                if (overrideData == null)
                {
                    overrideData = new TeamMemberOverride
                    {
                        TeamMemberId = member.Id
                    };
                    _context.TeamMemberOverrides.Add(overrideData);
                }

                overrideData.IsCrossMapped = dto.IsCrossMapped;
                overrideData.OverrideProjectId = dto.OverrideProjectId;
                overrideData.DifferentProject = dto.DifferentProject;
                overrideData.CustomReportingDays = dto.CustomReportingDays;
                overrideData.CustomWeeklyOffDays = dto.CustomWeeklyOffDays;
                overrideData.OverrideWeeklyOffDays = dto.CustomWeeklyOffDays
                    ? string.Join(",", NormalizeWeeklyOffDays(dto.WeeklyOffDays))
                    : null;

                if (dto.OverrideShiftId.HasValue && dto.OverrideShiftId.Value > 0)
                {
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = dto.OverrideShiftId.Value;
                }
                else
                {
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = null;

                    var activeAssignments = await _context.EmployeeShiftAssignments
                        .Where(a => a.Employee_Id == member.EmployeeId && a.IsActive)
                        .ToListAsync();

                    foreach (var a in activeAssignments)
                    {
                        a.IsActive = false;
                        a.EffectiveTo = DateTime.Now;
                        a.UpdatedDate = DateTime.Now;
                    }
                }

                await _context.SaveChangesAsync();

                var oldDays = await _context.TeamMemberReportingDays
                    .Where(x => x.TeamMemberId == member.Id)
                    .ToListAsync();

                _context.TeamMemberReportingDays.RemoveRange(oldDays);

                if (dto.CustomReportingDays && dto.ReportingDays != null)
                {
                    foreach (var day in dto.ReportingDays.Distinct())
                    {
                        _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                        {
                            TeamMemberId = member.Id,
                            DayName = day
                        });
                    }
                }

                await _context.SaveChangesAsync();

                AttendanceService.ClearShiftCache(member.EmployeeId);

                await _notificationService.CreateNotification(
                    "Team Configuration Updated",
                    "Your reporting configuration has been updated.");
                try

                {

                    var result = await _fcmNotificationService.SendToEmployeeAsync(

                        employeeId: member.EmployeeId,

                        title: "Team Configuration Updated",

                        body: "Your team reporting configuration, weekly offs, or shift settings have been updated.",

                        type: "TEAM_CONFIGURATION_UPDATED",

                        screen: "MyTeam",

                        data: new Dictionary<string, string>

                        {

                            ["teamId"] = member.TeamId.ToString(),

                            ["teamMemberId"] = member.Id.ToString(),

                            ["employeeId"] = member.EmployeeId

                        });

                    Console.WriteLine(

                        $"Team configuration FCM: Employee={member.EmployeeId}, " +

                        $"Success={result.SuccessCount}, " +

                        $"Failure={result.FailureCount}, " +

                        $"Status={result.Status}");

                }

                catch (Exception ex)

                {

                    Console.WriteLine(

                        $"Team configuration FCM failed for {member.EmployeeId}: {ex.Message}");

                }

                return new OkObjectResult("Member Override Updated Successfully.");

            }

            catch (Exception ex)

            {

                return new BadRequestObjectResult(ex.ToString());

            }

        }

        // ==========================================
        // EXPORT TEAMS (WEEKLY SHEETS)
        // ==========================================
        public async Task<IActionResult> ExportTeams(ClaimsPrincipal? user = null)
        {
            user ??= _httpContextAccessor.HttpContext?.User;
            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, user);

            var query = _context.Teams
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }
            else if (adminIds != null && adminIds.Any())
            {
                var tenantEmpIds = await CurrentUserHelper.FilterEmployeesByTenant(_context, null, adminIds)
                    .Select(e => e.Employee_Id)
                    .ToListAsync();

                query = query.Where(x => tenantEmpIds.Contains(x.ReportingManagerId));
            }

            var teams = await query.OrderBy(x => x.TeamNumber).ToListAsync();

            if (!teams.Any())
                return new NotFoundObjectResult("No teams found.");

            var teamIds = teams.Select(x => x.Id).ToList();

            var reportingDayHistory = await _context.TeamReportingDays
                .Where(x => teamIds.Contains(x.TeamId))
                .AsNoTracking()
                .OrderBy(x => x.TeamId)
                .ThenBy(x => x.EffectiveFrom)
                .ToListAsync();

            var firstDate = reportingDayHistory
                .Where(x => x.EffectiveFrom.HasValue && x.EffectiveFrom.Value >= new DateTime(2000, 1, 1))
                .Select(x => x.EffectiveFrom!.Value.Date)
                .DefaultIfEmpty(DateTime.Today)
                .Min();

            var lastDate = DateTime.Today;

            using var workbook = new XLWorkbook();

            var weekStart = firstDate;
            while (weekStart.DayOfWeek != DayOfWeek.Monday)
            {
                weekStart = weekStart.AddDays(-1);
            }

            while (weekStart <= lastDate)
            {
                var weekEnd = weekStart.AddDays(6);
                var displayWeekEnd = weekEnd > lastDate ? lastDate : weekEnd;

                var sheetName = $"{weekStart:dd-MMM-yyyy} to {displayWeekEnd:dd-MMM-yyyy}";
                if (sheetName.Length > 31)
                    sheetName = sheetName.Substring(0, 31);

                var baseSheetName = sheetName;
                int suffix = 1;

                while (workbook.Worksheets.Any(ws => string.Equals(ws.Name, sheetName, StringComparison.OrdinalIgnoreCase)))
                {
                    var suffixText = $" ({suffix++})";
                    sheetName = baseSheetName.Substring(0, Math.Min(baseSheetName.Length, 31 - suffixText.Length)) + suffixText;
                }

                var worksheet = workbook.Worksheets.Add(sheetName);

                worksheet.Cell(1, 1).Value = "Team No";
                worksheet.Cell(1, 2).Value = "Team Name";
                worksheet.Cell(1, 3).Value = "Reporting Days";
                worksheet.Cell(1, 4).Value = "Employee ID";
                worksheet.Cell(1, 5).Value = "Employee Name";

                var header = worksheet.Range(1, 1, 1, 5);
                header.Style.Font.Bold = true;
                header.Style.Font.FontColor = XLColor.White;
                header.Style.Fill.BackgroundColor = XLColor.DarkBlue;
                header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                int row = 2;
                var teamColors = new[]
                {
                    XLColor.LightBlue,
                    XLColor.LightGreen,
                    XLColor.LightYellow,
                    XLColor.LightPink,
                    XLColor.LightCyan,
                    XLColor.LightSalmon,
                    XLColor.LightGray
                };

                int colorIndex = 0;

                foreach (var team in teams)
                {
                    var teamHistory = reportingDayHistory
                        .Where(x => x.TeamId == team.Id)
                        .OrderBy(x => x.EffectiveFrom)
                        .ToList();

                    var activeHistory = teamHistory
                        .Where(x =>
                            x.EffectiveFrom <= displayWeekEnd.AddDays(1).AddTicks(-1) &&
                            (x.EffectiveTo == null || x.EffectiveTo > weekStart))
                        .ToList();

                    var latestEffectiveFrom = activeHistory
                        .Select(x => x.EffectiveFrom)
                        .Distinct()
                        .OrderByDescending(x => x)
                        .FirstOrDefault();

                    var reportingDays = activeHistory
                        .Where(x => x.EffectiveFrom == latestEffectiveFrom && !string.Equals(x.DayName, "NONE", StringComparison.OrdinalIgnoreCase))
                        .Select(x => GetShortDayName(x.DayName))
                        .Distinct()
                        .ToList();

                    var reportingDaysText = string.Join(", ", reportingDays);

                    var employees = team.Members
                        .Where(m => m.Employee != null)
                        .Select(m => new
                        {
                            EmployeeId = m.Employee!.Employee_Id,
                            EmployeeName = m.Employee.Name
                        })
                        .Where(x => !string.IsNullOrWhiteSpace(x.EmployeeId) || !string.IsNullOrWhiteSpace(x.EmployeeName))
                        .Distinct()
                        .OrderBy(x => x.EmployeeName)
                        .ToList();

                    if (!employees.Any())
                    {
                        worksheet.Cell(row, 1).Value = team.TeamNumber ?? "";
                        worksheet.Cell(row, 2).Value = team.TeamName ?? "";
                        worksheet.Cell(row, 3).Value = reportingDaysText;
                        worksheet.Cell(row, 4).Value = "";
                        worksheet.Cell(row, 5).Value = "";

                        var range = worksheet.Range(row, 1, row, 5);
                        range.Style.Fill.BackgroundColor = teamColors[colorIndex % teamColors.Length];
                        range.Style.Font.Bold = true;
                        range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                        range.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

                        row++;
                    }
                    else
                    {
                        int startRow = row;
                        foreach (var employee in employees)
                        {
                            worksheet.Cell(row, 1).Value = team.TeamNumber ?? "";
                            worksheet.Cell(row, 2).Value = team.TeamName ?? "";
                            worksheet.Cell(row, 3).Value = reportingDaysText;
                            worksheet.Cell(row, 4).Value = employee.EmployeeId ?? "";
                            worksheet.Cell(row, 5).Value = employee.EmployeeName ?? "";
                            row++;
                        }

                        int endRow = row - 1;
                        var teamRange = worksheet.Range(startRow, 1, endRow, 5);
                        teamRange.Style.Fill.BackgroundColor = teamColors[colorIndex % teamColors.Length];
                        teamRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                        teamRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                        worksheet.Range(startRow, 1, endRow, 3).Style.Font.Bold = true;
                    }

                    row += 2; // Blank row between teams
                    colorIndex++;
                }

                worksheet.Column(1).Width = 15;
                worksheet.Column(2).Width = 30;
                worksheet.Column(3).Width = 35;
                worksheet.Column(4).Width = 20;
                worksheet.Column(5).Width = 30;

                worksheet.RangeUsed().Style.Alignment.WrapText = true;
                worksheet.RangeUsed().Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                worksheet.SheetView.FreezeRows(1);

                weekStart = weekStart.AddDays(7);
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return new FileContentResult(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            {
                FileDownloadName = $"Teams_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
            };
        }
    }
}
