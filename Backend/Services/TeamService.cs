using DocumentFormat.OpenXml.Spreadsheet;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Services
{
    public class TeamService : ITeamService
    {
        private readonly AppDbContext _context;
        private readonly IAdminNotificationService _notificationService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public TeamService(
            AppDbContext context,
            IAdminNotificationService notificationService,
             IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _notificationService = notificationService;
            _httpContextAccessor = httpContextAccessor;
        }

        // ==========================================
        // CREATE TEAM
        // ==========================================
        public async Task<IActionResult> CreateTeam(CreateTeamDto dto)
        {
            if (dto == null)
                return new BadRequestObjectResult("Invalid team data.");

            var teamNumber = dto.TeamNumber?.Trim() ?? "";

            // 1. VALIDATE TEAM NUMBER
            if (string.IsNullOrWhiteSpace(teamNumber))
                return new BadRequestObjectResult("Team Number is required.");

            if (await _context.Teams.AnyAsync(x => x.TeamNumber == teamNumber))
            {
                return new BadRequestObjectResult("Team Number already exists.");
            }

            // 2. VALIDATE REPORTING MANAGER
            var manager = await _context.Employees
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
                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value);

                if (project == null)
                {
                    return new BadRequestObjectResult("Project not found.");
                }

                // 4. CHECK WHETHER TEAM ALREADY EXISTS FOR THIS PROJECT
                var existingTeam = await _context.Teams
                    .FirstOrDefaultAsync(x => x.ProjectId == dto.ProjectId.Value);

                if (existingTeam != null)
                {
                    return new BadRequestObjectResult($"A team already exists for project '{project.Project_Name}'.");
                }
            }

            // 5. DETERMINE TEAM NAME
            string resolvedTeamName = !string.IsNullOrWhiteSpace(dto.TeamName)
                ? dto.TeamName.Trim()
                : (project?.Project_Name ?? "Training Team");

            // 6. CREATE TEAM
            var team = new Team
            {
                TeamNumber = teamNumber,
                TeamName = resolvedTeamName,
                ReportingManagerId = dto.ReportingManagerId,
                EngagementType = dto.EngagementType,
                ProjectId = dto.ProjectId.HasValue && dto.ProjectId.Value > 0 ? dto.ProjectId : null,
                ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null,
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Teams.Add(team);
            await _context.SaveChangesAsync();

            // 7. SAVE REPORTING DAYS
            foreach (var day in dto.ReportingDays.Distinct())
            {
                _context.TeamReportingDays.Add(new TeamReportingDay
                {
                    TeamId = team.Id,
                    DayName = day
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

            // 9. ADD MEMBERS TO TEAM (WITH NULL SHIFT IF TEAM HAS NO SHIFT)
            foreach (var employeeId in membersToAdd)
            {
                var employeeExists = await _context.Employees
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

                // If team has no shift, member shift is explicitly null until assigned
                if (!team.ShiftId.HasValue)
                {
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = tm.Id,
                        CustomShift = true,
                        OverrideShiftId = null
                    });
                }
            }

            await _context.SaveChangesAsync();

            // 10. RESPONSE
            return new OkObjectResult(
                new
                {
                    Message = "Team Created Successfully.",
                    TeamId = team.Id,
                    TeamName = team.TeamName,
                    ProjectId = team.ProjectId,
                    ProjectName = project?.Project_Name ?? "N/A",
                    MemberCount = membersToAdd.Count
                });
        }

        public async Task<IActionResult> GetTeams()
        {
            var teams = await _context.Teams
    .Include(x => x.Project)
    .Include(x => x.ReportingManager)
    .Include(x => x.ReportingDays)
    .Include(x => x.Shift)            // <--- ADD THIS INCLUDE
    .Include(x => x.Members)
        .ThenInclude(m => m.Employee)
    .AsNoTracking()
    .ToListAsync();

            var result = teams.Select(x => new TeamListDto
            {
                TeamId = x.Id,
                TeamNumber = x.TeamNumber,
                TeamName = x.TeamName,
                ProjectName = x.Project?.Project_Name,
                ManagerName = x.ReportingManager?.Name,
                EngagementType = x.EngagementType,
                ShiftId = x.ShiftId,
                ShiftName = x.Shift?.ShiftName,
                EmployeeNames = x.Members.Where(m => m.Employee != null).Select(m => m.Employee.Name).ToList(),
                Members = x.Members.Where(m => m.Employee != null).Select(m => new TeamMemberSummaryDto
                {
                    EmployeeId = m.Employee.Employee_Id,
                    Name = m.Employee.Name
                }).ToList(),
                ReportingDays = x.ReportingDays.Select(d => GetShortDayName(d.DayName)).ToList()
            }).ToList();


            return new OkObjectResult(result);
        }


        public async Task<IActionResult> GetProjectTeams()
        {
            var projects = await _context.Projects
                .AsNoTracking()
                .Select(p => new
                {
                    ProjectId = p.Id,
                    ProjectName = p.Project_Name
                })
                .ToListAsync();

            var teams = await _context.Teams
                .AsNoTracking()
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
                    var team = teams.FirstOrDefault(
                        t => t.ProjectId == project.ProjectId);

                    return new
                    {
                        project.ProjectId,
                        project.ProjectName,

                        TeamExists = team != null,

                        TeamId = team?.TeamId,

                        TeamNumber = team?.TeamNumber,

                        TeamName = team?.TeamName ?? project.ProjectName,

                        ReportingManagerId =
                            team?.ReportingManagerId,

                        EngagementType =
                            team?.EngagementType,

                        IsActive =
                            team?.IsActive ?? true
                    };
                })
                .OrderBy(x => x.ProjectName)
                .ToList();

            return new OkObjectResult(result);
        }

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
        public async Task<IActionResult> GetTeamDetails(int teamId)
        {
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

            var memberIds = team.Members?
                .Select(m => m.Id)
                .ToList() ?? new List<int>();

            var memberEmployeeIds = team.Members?
                .Where(m => m.Employee != null)
                .Select(m => m.Employee.Employee_Id)
                .Distinct()
                .ToList() ?? new List<string>();

            var today = DateTime.Today;

            var allShifts = await _context.ShiftMasters
                .AsNoTracking()
                .ToListAsync();

            var rostersToday = await _context.ShiftRosters
                .Where(r => memberEmployeeIds.Contains(r.Employee_Id) && r.RosterDate.Date == today)
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

            var dto = new TeamDetailDto
            {
                TeamId = team.Id,
                TeamNumber = team.TeamNumber,
                TeamName = team.TeamName,

                ProjectId = team.ProjectId,
                ProjectName = team.Project?.Project_Name,

                ReportingManagerId = team.ReportingManagerId,
                ReportingManager = team.ReportingManager?.Name,

                EngagementType = team.EngagementType,

                ShiftId = team.ShiftId,
                ShiftName = team.Shift?.ShiftName,

                ReportingDays = team.ReportingDays != null
                    ? team.ReportingDays.Select(d => GetShortDayName(d.DayName)).ToList()
                    : new List<string>(),

                Members = (team.Members ?? new List<TeamMember>()).Select(x =>
                {
                    var empId = x.Employee?.Employee_Id ?? x.EmployeeId ?? "";
                    var roster = rostersToday.FirstOrDefault(r => r.Employee_Id == empId);
                    var memberOverride = overrides.FirstOrDefault(o => o.TeamMemberId == x.Id);
                    var assignment = assignments.FirstOrDefault(a => a.Employee_Id == empId);
                    int? effectiveShiftId;
                    string? effectiveShiftName;

                    if (memberOverride != null && memberOverride.CustomShift)
                    {
                        // If CustomShift is true and OverrideShiftId is null -> Employee has NO SHIFT (null)
                        effectiveShiftId = memberOverride.OverrideShiftId;
                        effectiveShiftName = memberOverride.OverrideShiftId.HasValue
                            ? memberOverride.OverrideShift?.ShiftName
                            : null;
                    }
                    else
                    {
                        // Only inherit roster or team shift if team has a shift assigned
                        effectiveShiftId = roster?.ShiftId ?? team.ShiftId;

                        effectiveShiftName = (roster != null
                            ? allShifts.FirstOrDefault(s => s.ShiftId == roster.ShiftId)?.ShiftName
                            : null)
                            ?? team.Shift?.ShiftName;
                    }


                    var shortDays = overrideDays
                        .Where(r => r.TeamMemberId == x.Id)
                        .Select(r => GetShortDayName(r.DayName))
                        .Distinct()
                        .ToList();

                    var wfhDays = shortDays.Any()
                        ? GetComplementDays(shortDays)
                        : new List<string>();

                    return new MemberDto
                    {
                        TeamMemberId = x.Id,
                        EmployeeId = empId,
                        Name = x.Employee?.Name ?? "",
                        Role = x.Employee?.RoleName ?? "",
                        Technology = technologyLookup.TryGetValue(empId, out var tech) ? tech : null,
                        ProjectName =
                            memberOverride != null &&
                            memberOverride.DifferentProject &&
                            memberOverride.OverrideProject != null
                                ? memberOverride.OverrideProject.Project_Name
                                : (team.Project?.Project_Name ?? ""),

                        OverrideProjectId = memberOverride?.OverrideProjectId,
                        OverrideProjectName = memberOverride?.OverrideProject?.Project_Name ?? "",

                        ShiftId = effectiveShiftId,
                        ShiftName = effectiveShiftName,

                        OverrideShiftId = effectiveShiftId != team.ShiftId ? effectiveShiftId : memberOverride?.OverrideShiftId,
                        OverrideShiftName = effectiveShiftId != team.ShiftId ? effectiveShiftName : (memberOverride?.OverrideShift?.ShiftName ?? ""),

                        CrossTeam = memberOverride?.DifferentProject ?? false,
                        OverrideWfoDays = shortDays,
                        OverrideWfhDays = wfhDays
                    };
                }).ToList()
            };

            return new OkObjectResult(dto);
        }

        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto)
        {
            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
                return new NotFoundObjectResult("Team not found.");

            // Validate Reporting Manager
            var manager = await _context.Employees
                .FirstOrDefaultAsync(x => x.Employee_Id == dto.ReportingManagerId);

            if (manager == null)
                return new BadRequestObjectResult("Reporting Manager not found.");

            // Validate Project
            var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.Id == dto.ProjectId);

            if (project == null)
                return new BadRequestObjectResult("Project not found.");

            team.TeamName = dto.TeamName;
            team.ReportingManagerId = dto.ReportingManagerId;
            team.EngagementType = dto.EngagementType;
            team.ProjectId = dto.ProjectId;
            team.ShiftId = dto.ShiftId;           // <--- ADD THIS


            // Update Reporting Days
            var oldDays = await _context.TeamReportingDays
                .Where(x => x.TeamId == dto.TeamId)
                .ToListAsync();

            _context.TeamReportingDays.RemoveRange(oldDays);

            foreach (var day in dto.ReportingDays.Distinct())
            {
                _context.TeamReportingDays.Add(new TeamReportingDay
                {
                    TeamId = dto.TeamId,
                    DayName = day
                });
            }

            // Update Members
            var oldMembers = await _context.TeamMembers
                .Where(x => x.TeamId == dto.TeamId)
                .ToListAsync();

            _context.TeamMembers.RemoveRange(oldMembers);

            foreach (var emp in dto.EmployeeIds.Distinct())
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

                if (employee == null)
                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

                _context.TeamMembers.Add(new TeamMember
                {
                    TeamId = dto.TeamId,
                    EmployeeId = emp
                });
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult("Team Updated Successfully.");
        }

        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == teamId);

            if (team == null)
                return new NotFoundResult();

            _context.Teams.Remove(team);

            await _context.SaveChangesAsync();

            return new NoContentResult(); // HTTP 204 - no response body
        }

        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto)
        {
            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
                return new NotFoundObjectResult("Team not found.");

            foreach (var emp in dto.EmployeeIds.Distinct())
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

                if (employee == null)
                    return new BadRequestObjectResult($"Employee '{emp}' does not exist.");

                bool exists = await _context.TeamMembers
                    .AnyAsync(x => x.TeamId == dto.TeamId &&
                                   x.EmployeeId == emp);

                if (!exists)
                {
                    var tm = new TeamMember
                    {
                        TeamId = dto.TeamId,
                        EmployeeId = emp
                    };
                    _context.TeamMembers.Add(tm);
                    await _context.SaveChangesAsync();

                    // Newly added members do NOT inherit team shift automatically (shift is null until assigned)
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = tm.Id,
                        CustomShift = true,
                        OverrideShiftId = null // Explicitly null until assigned
                    });
                }
            }

            await _context.SaveChangesAsync();

            return new OkObjectResult("Members Added Successfully.");
        }


        public async Task<IActionResult> RemoveMember(int teamId, string employeeId)
        {
            var member = await _context.TeamMembers
                .FirstOrDefaultAsync(x =>
                    x.TeamId == teamId &&
                    x.EmployeeId == employeeId);

            if (member == null)
                return new NotFoundObjectResult("Member not found.");

            _context.TeamMembers.Remove(member);

            await _context.SaveChangesAsync();

            return new OkObjectResult("Member Removed Successfully.");
        }

        public async Task<IActionResult> GetAvailableEmployees()
        {
            var assignedEmployees = await _context.TeamMembers
                .Select(x => x.EmployeeId)
                .ToListAsync();

            var employees = await _context.Employees
                .Where(x => !assignedEmployees.Contains(x.Employee_Id))
                .Select(x => new
                {
                    x.Employee_Id,
                    x.Name
                })
                .ToListAsync();

            return new OkObjectResult(employees);
        }

        public async Task<IActionResult> GetManagers()
        {
            // Check which database the API is actually connected to
            var databaseName = _context.Database
                .GetDbConnection()
                .Database;

            var managers = await (
                from e in _context.Employees
                join u in _context.Users
                    on e.Email equals u.Email
                join r in _context.Roles
                    on u.RoleId equals r.RoleId
                where r.Name == "Manager"
                orderby e.Name
                select new
                {
                    e.Employee_Id,
                    e.Name,
                    e.Email,
                    RoleName = r.Name
                })
                .AsNoTracking()
                .ToListAsync();

            return new OkObjectResult(new
            {
                database = databaseName,
                managers
            });
        }
        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto)
        {
            Console.WriteLine($"Received TeamId: {dto.TeamId}");
            Console.WriteLine($"Received TeamId: {dto.TeamId}");
            Console.WriteLine($"Received Days: {string.Join(",", dto.ReportingDays ?? new List<string>())}");

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
            {
                Console.WriteLine("Team not found in database.");
                return new NotFoundObjectResult("Team not found.");
            }

            Console.WriteLine($"Found Team: Id={team.Id}, IsActive={team.IsActive}");

            Console.WriteLine($"Found Team: {team.Id}, IsActive: {team.IsActive}");
            var existingDays = await _context.TeamReportingDays
                .Where(x => x.TeamId == dto.TeamId)
                .ToListAsync();

            _context.TeamReportingDays.RemoveRange(existingDays);

            foreach (var day in dto.ReportingDays.Distinct())
            {
                _context.TeamReportingDays.Add(new TeamReportingDay
                {
                    TeamId = dto.TeamId,
                    DayName = day
                });
            }

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotification(
                "Reporting Days Updated",
                $"Reporting days updated to {string.Join(", ", dto.ReportingDays)}");

            return new OkObjectResult("Reporting Days Updated Successfully.");
        }


        public async Task<IActionResult> GetMyTeam()
        {
            // 1. Get logged-in employee ID from JWT
            var employeeId =
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirst("EmployeeId")?
                    .Value
                ?? _httpContextAccessor.HttpContext?
                    .User
                    .FindFirst("Employee_Id")?
                    .Value;

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return new UnauthorizedObjectResult(new
                {
                    message = "Employee ID not found in JWT."
                });
            }

            // 2. Find the team membership of the logged-in employee
            var teamMember = await _context.TeamMembers
                .Include(tm => tm.TeamMemberOverride)
                    .ThenInclude(tmo => tmo.OverrideShift)
                .Include(tm => tm.TeamMemberOverride)
                    .ThenInclude(tmo => tmo.OverrideProject)
                .AsNoTracking()
                .FirstOrDefaultAsync(tm => tm.EmployeeId == employeeId);

            if (teamMember == null)
            {
                return new NotFoundObjectResult(new
                {
                    message = "You are not assigned to any team."
                });
            }

            // 3. Get team with Shift
            var team = await _context.Teams
                .Include(t => t.Shift)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == teamMember.TeamId && t.IsActive);

            if (team == null)
            {
                return new NotFoundObjectResult(new
                {
                    message = "Your team was not found."
                });
            }

            // 4. Get all member IDs for overrides and reporting days lookup
            var memberIds = await _context.TeamMembers
                .Where(tm => tm.TeamId == team.Id)
                .Select(tm => tm.Id)
                .ToListAsync();

            var overrides = await _context.TeamMemberOverrides
                .Include(x => x.OverrideShift)
                .Include(x => x.OverrideProject)
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            // ✅ Load Custom Reporting Days for Overridden Members
            var overrideDays = await _context.TeamMemberReportingDays
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

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
            var today = DateTime.Today;

            var technologyLookup = await _context.ProjectTeamMembers
                .AsNoTracking()
                .Where(x => x.ProjectId == team.ProjectId && memberEmployeeIds.Contains(x.EmployeeId))
                .GroupBy(x => x.EmployeeId)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.Select(x => x.Technology).FirstOrDefault());

            var allShifts = await _context.ShiftMasters
                .AsNoTracking()
                .ToListAsync();

            var rostersToday = await _context.ShiftRosters
                .Where(r => memberEmployeeIds.Contains(r.Employee_Id) && r.RosterDate.Date == today)
                .AsNoTracking()
                .ToListAsync();

            var assignments = await _context.EmployeeShiftAssignments
                .Include(a => a.Shift)
                .Where(a => memberEmployeeIds.Contains(a.Employee_Id) && a.IsActive)
                .AsNoTracking()
                .ToListAsync();

            // 5. Build Member DTOs with Overridden Shifts AND Overridden WFO/WFH Days
            var memberDtos = members.Select(m =>
            {
                var mo = overrides.FirstOrDefault(o => o.TeamMemberId == m.Id);
                var roster = rostersToday.FirstOrDefault(r => r.Employee_Id == m.EmployeeId);

                int? effectiveId;
                string? effectiveName;

                if (mo != null && mo.CustomShift)
                {
                    // Explicit override (either assigned shift or unassigned/null)
                    effectiveId = mo.OverrideShiftId;
                    effectiveName = mo.OverrideShiftId.HasValue ? mo.OverrideShift?.ShiftName : null;
                }
                else
                {
                    // Inherit daily roster if present, otherwise team's assigned shift (or null if team has no shift)
                    effectiveId = roster?.ShiftId ?? team.ShiftId;
                    effectiveName = (roster != null ? allShifts.FirstOrDefault(s => s.ShiftId == roster.ShiftId)?.ShiftName : null)
                        ?? team.Shift?.ShiftName;
                }

                // Member WFO / WFH Days
                var memberShortDays = overrideDays
                    .Where(r => r.TeamMemberId == m.Id)
                    .Select(r => GetShortDayName(r.DayName))
                    .Distinct()
                    .ToList();

                var memberWfhDays = memberShortDays.Any()
                    ? GetComplementDays(memberShortDays)
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
                    shiftId = effectiveId,
                    shiftName = effectiveName,
                    overrideShiftId = effectiveId,
                    overrideShiftName = effectiveName ?? "",
                    crossTeam = mo?.DifferentProject ?? false,
                    customReportingDays = mo?.CustomReportingDays ?? false,
                    overrideWfoDays = memberShortDays,
                    overrideWfhDays = memberWfhDays
                };
            }).ToList();

            // 6. Get Project
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == team.ProjectId);

            // 7. Base Team Reporting Days
            var baseTeamReportingDays = await _context.TeamReportingDays
                .AsNoTracking()
                .Where(rd => rd.TeamId == team.Id)
                .Select(rd => GetShortDayName(rd.DayName))
                .ToListAsync();

            // 8. Determine Logged-in Employee's Effective Reporting Days
            var myOverride = teamMember.TeamMemberOverride;
            var myOverrideDays = overrideDays
                .Where(r => r.TeamMemberId == teamMember.Id)
                .Select(r => GetShortDayName(r.DayName))
                .Distinct()
                .ToList();

            var effectiveReportingDays = (myOverride != null && myOverride.CustomReportingDays && myOverrideDays.Any())
                ? myOverrideDays
                : baseTeamReportingDays;

            // 9. Determine Logged-in Employee's Effective Shift
            int? effectiveShiftId;
            string? effectiveShiftName;

            if (myOverride != null && myOverride.CustomShift)
            {
                effectiveShiftId = myOverride.OverrideShiftId;
                effectiveShiftName = myOverride.OverrideShiftId.HasValue ? myOverride.OverrideShift?.ShiftName : null;
            }
            else
            {
                var myRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == employeeId);
                effectiveShiftId = myRoster?.ShiftId ?? team.ShiftId;
                effectiveShiftName = (myRoster != null ? allShifts.FirstOrDefault(s => s.ShiftId == myRoster.ShiftId)?.ShiftName : null)
                    ?? team.Shift?.ShiftName;
            }

            // 10. Return Unified Response
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

                // Shifts
                shiftId = effectiveShiftId,
                shiftName = effectiveShiftName,
                myShiftId = effectiveShiftId,
                myShiftName = effectiveShiftName,
                teamShiftId = team.ShiftId,
                teamShiftName = team.Shift?.ShiftName,

                // Reporting Days (Reflects Custom Override Days)
                reportingDays = effectiveReportingDays,
                members = memberDtos
            });
        }

        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto)
        {
            try
            {
                TeamMember? member = null;
                if (dto.TeamMemberId > 0)
                {
                    member = await _context.TeamMembers
                        .FirstOrDefaultAsync(x => x.Id == dto.TeamMemberId);
                }

                if (member == null && !string.IsNullOrWhiteSpace(dto.EmployeeId))
                {
                    var empId = dto.EmployeeId.Trim();
                    if (dto.TeamId > 0)
                    {
                        member = await _context.TeamMembers
                            .FirstOrDefaultAsync(x => x.TeamId == dto.TeamId && x.EmployeeId == empId);
                    }
                    if (member == null)
                    {
                        member = await _context.TeamMembers
                            .FirstOrDefaultAsync(x => x.EmployeeId == empId);
                    }
                }

                if (member == null)
                    return new NotFoundObjectResult("Team Member not found.");

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

                if (dto.OverrideShiftId.HasValue && dto.OverrideShiftId.Value > 0)
                {
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = dto.OverrideShiftId.Value;
                }
                else
                {
                    // Explicitly Unassigned / No Shift
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = null;

                    // Deactivate direct shift assignments for this employee so they don't linger
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
                    .Where(x => x.TeamMemberId == dto.TeamMemberId)
                    .ToListAsync();

                _context.TeamMemberReportingDays.RemoveRange(oldDays);

                if (dto.CustomReportingDays && dto.ReportingDays != null)
                {
                    foreach (var day in dto.ReportingDays.Distinct())
                    {
                        _context.TeamMemberReportingDays.Add(
                            new TeamMemberReportingDay
                            {
                                TeamMemberId = dto.TeamMemberId,
                                DayName = day
                            });
                    }
                }

                await _context.SaveChangesAsync();

                // Clear attendance shift cache for this employee so attendance uses the updated/unassigned shift immediately
                AttendanceService.ClearShiftCache(member.EmployeeId);

                await _notificationService.CreateNotification(
                    "Team Configuration Updated",
                    "Your reporting configuration has been updated.");

                return new OkObjectResult(
                    "Member Override Updated Successfully.");
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult(ex.ToString());
            }
        }
    }
}
