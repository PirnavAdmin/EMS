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

        public async Task<IActionResult> CreateTeam(CreateTeamDto dto)
        {
            // ==========================================
            // 1. VALIDATE TEAM NUMBER
            // ==========================================

            if (await _context.Teams
                .AnyAsync(x => x.TeamNumber == dto.TeamNumber))
            {
                return new BadRequestObjectResult(
                    "Team Number already exists.");
            }


            // ==========================================
            // 2. VALIDATE REPORTING MANAGER
            // ==========================================

            var manager = await _context.Employees
                .FirstOrDefaultAsync(x =>
                    x.Employee_Id == dto.ReportingManagerId);

            if (manager == null)
            {
                return new BadRequestObjectResult(
                    "Reporting Manager not found.");
            }


            // ==========================================
            // 3. GET PROJECT
            // ==========================================

            var project = await _context.Projects
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.ProjectId);

            if (project == null)
            {
                return new BadRequestObjectResult(
                    "Project not found.");
            }


            // ==========================================
            // 4. CHECK WHETHER TEAM ALREADY EXISTS
            //    FOR THIS PROJECT
            // ==========================================

            var existingTeam = await _context.Teams
                .FirstOrDefaultAsync(x =>
                    x.ProjectId == dto.ProjectId);

            if (existingTeam != null)
            {
                return new BadRequestObjectResult(
                    $"A team already exists for project '{project.Project_Name}'.");
            }


            // ==========================================
            // 5. CREATE TEAM
            //
            // Team Name comes from Project Name
            // ==========================================

            var team = new Team
            {
                TeamNumber = dto.TeamNumber,

                // IMPORTANT:
                // Do NOT take TeamName from frontend
                TeamName = project.Project_Name,

                ReportingManagerId = dto.ReportingManagerId,

                EngagementType = dto.EngagementType,

                ProjectId = dto.ProjectId,

                IsActive = true,

                CreatedAt = DateTime.Now
            };

            _context.Teams.Add(team);

            await _context.SaveChangesAsync();


            // ==========================================
            // 6. SAVE TEAM REPORTING DAYS
            // ==========================================

            foreach (var day in dto.ReportingDays.Distinct())
            {
                _context.TeamReportingDays.Add(
                    new TeamReportingDay
                    {
                        TeamId = team.Id,
                        DayName = day
                    });
            }


            // ==========================================
            // 7. GET EXISTING PROJECT MEMBERS
            // ==========================================

            var projectMembers = await _context.ProjectTeamMembers
                .Where(x => x.ProjectId == dto.ProjectId)
                .Select(x => x.EmployeeId)
                .Distinct()
                .ToListAsync();


            // ==========================================
            // 8. IF PROJECT HAS MEMBERS
            //    USE EXISTING PROJECT MEMBERS
            //
            //    IF PROJECT HAS NO MEMBERS
            //    USE MANUALLY SELECTED EMPLOYEES
            // ==========================================

            var membersToAdd = projectMembers.Any()
                ? projectMembers
                : dto.EmployeeIds
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList();


            // ==========================================
            // 9. ADD MEMBERS TO TEAM
            // ==========================================

            foreach (var employeeId in membersToAdd)
            {
                var employeeExists = await _context.Employees
                    .AnyAsync(x =>
                        x.Employee_Id == employeeId);

                if (!employeeExists)
                {
                    return new BadRequestObjectResult(
                        $"Employee '{employeeId}' does not exist.");
                }

                var alreadyExists = await _context.TeamMembers
                    .AnyAsync(x =>
                        x.TeamId == team.Id &&
                        x.EmployeeId == employeeId);

                if (!alreadyExists)
                {
                    _context.TeamMembers.Add(
                        new TeamMember
                        {
                            TeamId = team.Id,
                            EmployeeId = employeeId
                        });
                }
            }

            // ==========================================
            // 9. SAVE EVERYTHING
            // ==========================================

            await _context.SaveChangesAsync();


            // ==========================================
            // 10. RESPONSE
            // ==========================================

            return new OkObjectResult(
                new
                {
                    Message = "Team Created Successfully.",
                    TeamId = team.Id,
                    TeamName = team.TeamName,
                    ProjectId = team.ProjectId,
                    ProjectName = project.Project_Name,
                    MemberCount = membersToAdd.Count
                });
        }
        public async Task<IActionResult> GetTeams()
        {
            var teams = await _context.Teams
                .Include(x => x.Project)
                .Include(x => x.ReportingManager)
                .Include(x => x.ReportingDays)
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

                EmployeeNames = x.Members
                    .Select(m => m.Employee.Name)
                    .ToList(),

                ReportingDays = x.ReportingDays
                    .Select(d => GetShortDayName(d.DayName))
                    .ToList()
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
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == teamId);

            if (team == null)
            {
                return new NotFoundObjectResult("Team Not Found.");
            }

            var memberIds = team.Members
                .Select(m => m.Id)
                .ToList();

            var overrides = await _context.TeamMemberOverrides
                .Include(x => x.OverrideProject)
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

            var overrideDays = await _context.TeamMemberReportingDays
                .Where(x => memberIds.Contains(x.TeamMemberId))
                .ToListAsync();

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

                ReportingDays = team.ReportingDays
                    .Select(d => GetShortDayName(d.DayName))
                    .ToList(),

                Members = team.Members.Select(x =>
                {
                    var memberOverride = overrides
    .FirstOrDefault(o => o.TeamMemberId == x.Id);

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
                        EmployeeId = x.Employee?.Employee_Id,
                        Name = x.Employee?.Name,
                        Role = x.Employee?.RoleName,
                        ProjectName =
    memberOverride != null &&
    memberOverride.DifferentProject &&
    memberOverride.OverrideProject != null
        ? memberOverride.OverrideProject.Project_Name
        : team.Project.Project_Name,

                        OverrideProjectId = memberOverride?.OverrideProjectId,

                        OverrideProjectName = memberOverride?.OverrideProject?.Project_Name,

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
                    _context.TeamMembers.Add(new TeamMember
                    {
                        TeamId = dto.TeamId,
                        EmployeeId = emp
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
            // Get logged-in employee ID from JWT
            var employeeId =
                _httpContextAccessor.HttpContext?
                    .User
                    .FindFirst("EmployeeId")?
                    .Value;

            if (string.IsNullOrWhiteSpace(employeeId))
            {
                return new UnauthorizedObjectResult(new
                {
                    message = "Employee ID not found in JWT."
                });
            }

            // Find the team of the logged-in employee
            var teamMember = await _context.TeamMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(tm =>
                    tm.EmployeeId == employeeId);

            if (teamMember == null)
            {
                return new NotFoundObjectResult(new
                {
                    message = "You are not assigned to any team."
                });
            }

            // Get team
            var team = await _context.Teams
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.Id == teamMember.TeamId &&
                    t.IsActive);

            if (team == null)
            {
                return new NotFoundObjectResult(new
                {
                    message = "Your team was not found."
                });
            }

            // Get all members of the same team
            var members = await _context.TeamMembers
                .AsNoTracking()
                .Where(tm => tm.TeamId == team.Id)
                .Join(
                    _context.Employees,
                    tm => tm.EmployeeId,
                    e => e.Employee_Id,
                    (tm, e) => new
                    {
                        EmployeeId = e.Employee_Id,
                        Name = e.Name
                    })
                .ToListAsync();

            // Get project
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p =>
                    p.Id == team.ProjectId);

            // Get reporting days
            var reportingDays = await _context.TeamReportingDays
                .AsNoTracking()
                .Where(rd => rd.TeamId == team.Id)
                .Select(rd => rd.DayName)
                .ToListAsync();

            return new OkObjectResult(new
            {
                teamId = team.Id,
                teamNumber = team.TeamNumber,
                teamName = team.TeamName,

                projectId = team.ProjectId,
                projectName = project != null
                    ? project.Project_Name
                    : null,

                reportingManagerId = team.ReportingManagerId,
                engagementType = team.EngagementType,

                reportingDays = reportingDays,

                members = members
            });
        }
        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto)
        {
            try
            {
                var member = await _context.TeamMembers
                    .FirstOrDefaultAsync(x => x.Id == dto.TeamMemberId);

                if (member == null)
                    return new NotFoundObjectResult("Team Member not found.");

                var overrideData = await _context.TeamMemberOverrides
                    .FirstOrDefaultAsync(x => x.TeamMemberId == dto.TeamMemberId);

                if (overrideData == null)
                {
                    overrideData = new TeamMemberOverride
                    {
                        TeamMemberId = dto.TeamMemberId
                    };

                    _context.TeamMemberOverrides.Add(overrideData);
                }

                overrideData.IsCrossMapped = dto.IsCrossMapped;
                overrideData.OverrideProjectId = dto.OverrideProjectId;
                overrideData.DifferentProject = dto.DifferentProject;
                overrideData.CustomReportingDays = dto.CustomReportingDays;

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
