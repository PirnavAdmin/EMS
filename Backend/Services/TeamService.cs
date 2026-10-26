using Aspose.Words.XAttr;
using ClosedXML.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenXmlPowerTools;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Services
{
    public class TeamService : ITeamService
    {
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

            Project? project = null;

            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                project = await _context.Projects
                    .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value);

                if (project == null)
                {
                    return new BadRequestObjectResult("Project not found.");
                }
            }


            // ==========================================
            // 4. CHECK WHETHER TEAM ALREADY EXISTS
            //    FOR THIS PROJECT
            // ==========================================

            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                var existingTeam = await _context.Teams
                    .FirstOrDefaultAsync(x => x.ProjectId == dto.ProjectId.Value);

                if (existingTeam != null)
                {
                    return new BadRequestObjectResult(
                        $"A team already exists for project '{project!.Project_Name}'.");
                }
            }


            // ==========================================
            // 5. CREATE TEAM
            //
            // Team Name comes from Project Name
            // ==========================================

            var team = new Team
            {
                TeamNumber = dto.TeamNumber,
                TeamName = project != null
    ? project.Project_Name
    : dto.TeamName,
                ReportingManagerId = dto.ReportingManagerId,
                EngagementType = dto.EngagementType,
                ProjectId = dto.ProjectId,
                ShiftId = dto.ShiftId,            // <--- ADD THIS
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
                        DayName = day,
                        EffectiveFrom = DateTime.Now,
                        EffectiveTo = null
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

            // ==========================================
            // 9. ADD MEMBERS TO TEAM (Default: No Shift)
            // ==========================================

            foreach (var employeeId in membersToAdd)
            {
                var employeeExists = await _context.Employees
                    .AnyAsync(x => x.Employee_Id == employeeId);

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
                    var tm = new TeamMember
                    {
                        TeamId = team.Id,
                        EmployeeId = employeeId
                    };
                    _context.TeamMembers.Add(tm);
                    await _context.SaveChangesAsync();

                    // FIX: Ensure newly added employee does NOT inherit the team's shift by default
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = tm.Id,
                        CustomShift = true,
                        OverrideShiftId = null
                    });

                    // Keep the original behavior: initial team members receive the team's reporting days.
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
                    ProjectName = project?.Project_Name,
                    MemberCount = membersToAdd.Count
                });
        }
        public async Task<IActionResult> GetTeams()
        {
            var teams = await _context.Teams
                .Include(x => x.Project)
                .Include(x => x.ReportingManager)
                .Include(x => x.Shift)
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking()
                .ToListAsync();

            if (!teams.Any())
                return new OkObjectResult(new List<TeamListDto>());

            var teamIds = teams
                .Select(x => x.Id)
                .ToList();

            // Get COMPLETE reporting-day history
            var reportingDayHistory = await _context.TeamReportingDays
                .Where(x => teamIds.Contains(x.TeamId))
                .AsNoTracking()
                .OrderBy(x => x.TeamId)
                .ThenBy(x => x.EffectiveFrom)
                .ToListAsync();

            var result = teams.Select(x =>
            {
                // Declare this FIRST - Filter only active reporting days
                var teamReportingDays = reportingDayHistory
                    .Where(d => d.TeamId == x.Id && (d.EffectiveTo == null || d.EffectiveTo > DateTime.Now))
                    .Select(d => new ReportingDayDto
                    {
                        DayName = GetShortDayName(d.DayName),
                        EffectiveFrom = d.EffectiveFrom,
                        EffectiveTo = d.EffectiveTo,
                        ActualDates = GetActualReportingDates(
                            d.DayName,
                            d.EffectiveFrom,
                            d.EffectiveTo)
                    })
                    .ToList();

                // Create the DTO AFTER the variable is declared
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

                    EmployeeNames = x.Members
                        .Where(m => m.Employee != null)
                        .Select(m => m.Employee.Name)
                        .ToList(),

                    Members = x.Members
                        .Where(m => m.Employee != null)
                        .Select(m => new TeamMemberSummaryDto
                        {
                            EmployeeId = m.Employee.Employee_Id,
                            Name = m.Employee.Name
                        })
                        .ToList(),

                    ReportingDays = teamReportingDays
                };
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

                _ => throw new ArgumentException(
                    $"Invalid reporting day: {dayName}")
            };

            var startDate = effectiveFrom.Date;

            // Historical configurations end at EffectiveTo.
            // Current configurations return dates through today.
            var endDate = effectiveTo?.Date ?? DateTime.Today;

            var dates = new List<DateTime>();

            if (endDate < startDate)
                return dates;

            // Find the first occurrence of this reporting day
            // on or after EffectiveFrom.
            var daysUntilTarget =
                ((int)targetDay - (int)startDate.DayOfWeek + 7) % 7;

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
                return new NotFoundObjectResult("Team Not Found.");

            var memberIds = team.Members?.Select(m => m.Id).ToList() ?? new List<int>();
            var memberEmployeeIds = team.Members?.Where(m => m.Employee != null).Select(m => m.Employee.Employee_Id).Distinct().ToList() ?? new List<string>();

            var today = DateTime.Today;
            var allShifts = await _context.ShiftMasters.AsNoTracking().ToListAsync();

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

            // Filter only currently active reporting days (EffectiveTo is null or in the future)
            var activeTeamDays = team.ReportingDays != null
                ? team.ReportingDays
                    .Where(d => d.EffectiveTo == null || d.EffectiveTo > DateTime.Now)
                    .Select(d => GetShortDayName(d.DayName))
                    .Distinct()
                    .ToList()
                : new List<string>();

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
                ReportingDays = activeTeamDays,

                Members = (team.Members ?? new List<TeamMember>()).Select(x =>
                {
                    var empId = x.Employee?.Employee_Id ?? x.EmployeeId ?? "";
                    var roster = rostersToday.FirstOrDefault(r => r.Employee_Id == empId);
                    var memberOverride = overrides.FirstOrDefault(o => o.TeamMemberId == x.Id);

                    int? effectiveShiftId;
                    string? effectiveShiftName;

                    // =========================================================================
                    // KEY FIX: Team Shift Inheritance Logic
                    // If the member has an explicit custom shift, use it.
                    // Otherwise, inherit the team default shift (or daily roster).
                    // =========================================================================
                    bool hasExplicitCustomShift =
                        memberOverride != null &&
                        memberOverride.CustomShift;

                    if (hasExplicitCustomShift)
                    {
                        // Individual shift is explicitly assigned OR explicitly unassigned
                        effectiveShiftId = memberOverride!.OverrideShiftId;

                        effectiveShiftName = memberOverride.OverrideShiftId.HasValue
                            ? memberOverride.OverrideShift?.ShiftName
                                ?? allShifts.FirstOrDefault(
                                    s => s.ShiftId == memberOverride.OverrideShiftId.Value
                                )?.ShiftName
                            : null;
                    }
                    else
                    {
                        // No individual override -> inherit team shift
                        effectiveShiftId = roster?.ShiftId ?? team.ShiftId;

                        effectiveShiftName = (roster != null
                            ? allShifts.FirstOrDefault(
                                s => s.ShiftId == roster.ShiftId
                            )?.ShiftName
                            : null)
                            ?? team.Shift?.ShiftName;
                    }

                    var memberOverrideDays = overrideDays
                        .Where(r => r.TeamMemberId == x.Id)
                        .Select(r => GetShortDayName(r.DayName))
                        .Distinct()
                        .ToList();

                    // If member has custom reporting days, use them; otherwise inherit the active team reporting days
                    var shortDays = (memberOverride != null && memberOverride.CustomReportingDays && memberOverrideDays.Any())
                        ? memberOverrideDays
                        : activeTeamDays;

                    var wfhDays = GetComplementDays(shortDays);

                    return new TeamMemberDto
                    {
                        TeamMemberId = x.Id,
                        EmployeeId = empId,
                        EmployeeName = x.Employee?.Name ?? "",
                        Email = x.Employee?.Email ?? "",
                        CustomReportingDays = memberOverride?.CustomReportingDays ?? false,
                        OverrideProjectId = memberOverride?.OverrideProjectId,
                        OverrideProjectName = memberOverride?.OverrideProject?.Project_Name ?? "",
                        CustomShift = hasExplicitCustomShift,
                        ShiftId = effectiveShiftId,
                        ShiftName = effectiveShiftName,
                        OverrideShiftId = hasExplicitCustomShift ? memberOverride!.OverrideShiftId : null,
                        OverrideShiftName = hasExplicitCustomShift ? effectiveShiftName : null,
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
            if (dto.ProjectId.HasValue && dto.ProjectId.Value > 0)
            {
                var project = await _context.Projects
                .FirstOrDefaultAsync(x => x.Id == dto.ProjectId.Value);

                if (project == null)
                    return new BadRequestObjectResult("Project not found.");

                team.ProjectId = dto.ProjectId.Value;
            }
            else
            {
                team.ProjectId = null;
            }

            team.TeamName = dto.TeamName;
            team.ReportingManagerId = dto.ReportingManagerId;
            team.EngagementType = dto.EngagementType;

            // =========================================================================
            // Assigns Team Shift (all members without explicit overrides inherit this)
            // =========================================================================
            team.ShiftId = dto.ShiftId.HasValue && dto.ShiftId.Value > 0 ? dto.ShiftId : null;

            // Update Reporting Days
            var oldDays = await _context.TeamReportingDays
            .Where(x => x.TeamId == dto.TeamId)
            .ToListAsync();

            _context.TeamReportingDays.RemoveRange(oldDays);

            var now = DateTime.Now;
            foreach (var day in dto.ReportingDays.Distinct())
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
            var existingOverrides = await _context.TeamMemberOverrides
                .Where(o => oldMemberIds.Contains(o.TeamMemberId))
                .ToListAsync();

            _context.TeamMembers.RemoveRange(oldMembers);
            await _context.SaveChangesAsync();

            foreach (var emp in dto.EmployeeIds.Distinct())
            {
                var employee = await _context.Employees
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
                    // =========================================================================
                    // REQUIREMENT 1 & SCENARIO C:
                    // Existing members get the team's shift!
                    // When the team shift changes, any previously overridden shift is also changed 
                    // to the new team shift.
                    // Setting CustomShift = false allows them to inherit team.ShiftId!
                    // =========================================================================
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = newTm.Id,
                        CustomShift = false, // <-- Inherits team's new shift
                        OverrideShiftId = null
                    });
                }
                else
                {
                    // =========================================================================
                    // REQUIREMENT 2 (SCENARIO B):
                    // Newly added members get NO SHIFT (unassigned), but GET team reporting days.
                    // =========================================================================
                    _context.TeamMemberOverrides.Add(new TeamMemberOverride
                    {
                        TeamMemberId = newTm.Id,
                        CustomShift = true, // <-- Explicitly blocks team shift
                        OverrideShiftId = null // <-- No Shift Assigned
                    });

                    // Assign team's reporting days to this newly added member
                    foreach (var day in dto.ReportingDays.Distinct())
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

            // Clear attendance shift cache for all members so the new shift applies immediately
            foreach (var emp in dto.EmployeeIds.Distinct())
            {
                AttendanceService.ClearShiftCache(emp);
            }

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

            var newlyAddedEmployeeIds = new List<string>();

            foreach (var emp in dto.EmployeeIds
                         .Where(x => !string.IsNullOrWhiteSpace(x))
                         .Distinct())
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(x => x.Employee_Id == emp);

                if (employee == null)
                    return new BadRequestObjectResult(
                        $"Employee '{emp}' does not exist.");

                bool exists = await _context.TeamMembers
                    .AnyAsync(x =>
                        x.TeamId == dto.TeamId &&
                        x.EmployeeId == emp);

                if (exists)
                    continue;

                var tm = new TeamMember
                {
                    TeamId = dto.TeamId,
                    EmployeeId = emp
                };

                _context.TeamMembers.Add(tm);
                await _context.SaveChangesAsync();

                _context.TeamMemberOverrides.Add(new TeamMemberOverride
                {
                    TeamMemberId = tm.Id,
                    CustomShift = true,
                    OverrideShiftId = null
                });

                // Keep the original behavior: new members receive the team's active reporting days.
                var teamDays = await _context.TeamReportingDays
                    .Where(x => x.TeamId == dto.TeamId &&
                                (x.EffectiveTo == null || x.EffectiveTo > DateTime.Now))
                    .Select(x => x.DayName)
                    .Distinct()
                    .ToListAsync();

                foreach (var day in teamDays)
                {
                    _context.TeamMemberReportingDays.Add(new TeamMemberReportingDay
                    {
                        TeamMemberId = tm.Id,
                        DayName = day
                    });
                }

                newlyAddedEmployeeIds.Add(emp);
            }

            await _context.SaveChangesAsync();

            // Send push notifications only to newly added employees.
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
            Console.WriteLine($"Received Days: {string.Join(",", dto.ReportingDays ?? new List<string>())}");

            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.Id == dto.TeamId);

            if (team == null)
            {
                Console.WriteLine("Team not found in database.");
                return new NotFoundObjectResult("Team not found.");
            }

            Console.WriteLine($"Found Team: Id={team.Id}, IsActive={team.IsActive}");
            var now = DateTime.Now;

            // Get currently active reporting days
            var currentDays = await _context.TeamReportingDays
                .Where(x =>
                    x.TeamId == dto.TeamId &&
                    x.EffectiveTo == null)
                .ToListAsync();

            // Close the old reporting days
            // Normalize and compare existing and requested reporting days
            var existingDays = currentDays
                .Select(x => x.DayName.Trim().ToLowerInvariant())
                .ToHashSet();

            var requestedDays = (dto.ReportingDays ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var newDays = requestedDays
                .Select(x => x.ToLowerInvariant())
                .ToHashSet();

            if (existingDays.SetEquals(newDays))
            {
                return new OkObjectResult(
                    "Reporting days are unchanged. No update or notification required.");
            }

            // Close the old reporting days
            foreach (var oldDay in currentDays)
            {
                oldDay.EffectiveTo = now;
            }

            // Add the new reporting days
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



            // Keep member-specific reporting days synchronized for members who inherit the team schedule.
            var teamMembers = await _context.TeamMembers
                .Where(m => m.TeamId == dto.TeamId)
                .ToListAsync();

            var memberIds = teamMembers.Select(m => m.Id).ToList();
            var customMemberIds = await _context.TeamMemberOverrides
                .Where(o => memberIds.Contains(o.TeamMemberId) && o.CustomReportingDays)
                .Select(o => o.TeamMemberId)
                .ToListAsync();

            var defaultMemberIds = memberIds.Except(customMemberIds).ToList();
            if (defaultMemberIds.Any())
            {
                var oldMemberDays = await _context.TeamMemberReportingDays
                    .Where(r => defaultMemberIds.Contains(r.TeamMemberId))
                    .ToListAsync();

                _context.TeamMemberReportingDays.RemoveRange(oldMemberDays);

                foreach (var memberId in defaultMemberIds)
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
                var registeredEmployeeIds = await _context.UserNotificationDevices
                    .Where(d => d.IsActive)
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


        public async Task<IActionResult> GetMyTeam()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            var employeeId = user?.FindFirst("EmployeeId")?.Value
            ?? user?.FindFirst("Employee_Id")?.Value
            ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(employeeId))
                return new UnauthorizedObjectResult(new { message = "Employee ID not found in JWT." });

            var teamMember = await _context.TeamMembers
            .Include(tm => tm.TeamMemberOverride)
            .ThenInclude(tmo => tmo.OverrideShift)
            .Include(tm => tm.TeamMemberOverride)
            .ThenInclude(tmo => tmo.OverrideProject)
            .AsNoTracking()
            .FirstOrDefaultAsync(tm => tm.EmployeeId == employeeId);

            if (teamMember == null)
                return new NotFoundObjectResult(new { message = "You are not assigned to any team." });

            var team = await _context.Teams
            .Include(t => t.Shift)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == teamMember.TeamId && t.IsActive);

            if (team == null)
                return new NotFoundObjectResult(new { message = "Your team was not found." });

            var memberIds = await _context.TeamMembers.Where(tm => tm.TeamId == team.Id).Select(tm => tm.Id).ToListAsync();
            var overrides = await _context.TeamMemberOverrides
            .Include(x => x.OverrideShift)
            .Include(x => x.OverrideProject)
            .Where(x => memberIds.Contains(x.TeamMemberId))
            .ToListAsync();

            var overrideDays = await _context.TeamMemberReportingDays.Where(x => memberIds.Contains(x.TeamMemberId)).ToListAsync();

            var today = DateTime.Today;
            var allShifts = await _context.ShiftMasters.AsNoTracking().ToListAsync();

            var rostersToday = await _context.ShiftRosters
            .Where(r => r.RosterDate.Date == today)
            .AsNoTracking()
            .ToListAsync();

            var members = await _context.TeamMembers
            .AsNoTracking()
            .Where(tm => tm.TeamId == team.Id)
            .Join(_context.Employees, tm => tm.EmployeeId, e => e.Employee_Id, (tm, e) => new { tm, e })
            .ToListAsync();

            var memberDtos = members.Select(m =>
            {
                var mo = overrides.FirstOrDefault(o => o.TeamMemberId == m.tm.Id);
                var memberOverrideDays = overrideDays
                .Where(r => r.TeamMemberId == m.tm.Id)
                .Select(r => GetShortDayName(r.DayName))
                .Distinct()
                .ToList();

                var memberWfhDays = GetComplementDays(memberOverrideDays);
                var memberRoster = rostersToday.FirstOrDefault(r => r.Employee_Id == m.e.Employee_Id);

                // =========================================================================
                // KEY FIX: Effective Shift for Team Members
                // =========================================================================
                bool hasExplicitCustomShift =
                    mo != null &&
                    mo.CustomShift;

                int? effectiveId;
                string? effectiveName;

                if (hasExplicitCustomShift)
                {
                    // Individual shift is explicitly assigned OR explicitly unassigned
                    effectiveId = mo!.OverrideShiftId;

                    effectiveName = mo.OverrideShiftId.HasValue
                        ? mo.OverrideShift?.ShiftName
                            ?? allShifts.FirstOrDefault(
                                s => s.ShiftId == mo.OverrideShiftId.Value
                            )?.ShiftName
                        : null;
                }
                else
                {
                    // No individual override -> inherit team shift
                    effectiveId = memberRoster?.ShiftId ?? team.ShiftId;

                    effectiveName = (memberRoster != null
                        ? allShifts.FirstOrDefault(
                            s => s.ShiftId == memberRoster.ShiftId
                        )?.ShiftName
                        : null)
                        ?? team.Shift?.ShiftName;
                }

                return new
                {
                    teamMemberId = m.tm.Id,
                    employeeId = m.e.Employee_Id,
                    name = m.e.Name,
                    email = m.e.Email,
                    customShift = hasExplicitCustomShift,
                    shiftId = effectiveId,
                    shiftName = effectiveName,
                    overrideShiftId = hasExplicitCustomShift ? mo!.OverrideShiftId : null,
                    overrideShiftName = hasExplicitCustomShift ? effectiveName : null,
                    crossTeam = mo?.DifferentProject ?? false,
                    customReportingDays = mo?.CustomReportingDays ?? false,
                    overrideWfoDays = memberOverrideDays,
                    overrideWfhDays = memberWfhDays
                };
            }).ToList();

            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == team.ProjectId);
            var baseTeamReportingDays = await _context.TeamReportingDays
                .AsNoTracking()
                .Where(rd => rd.TeamId == team.Id && (rd.EffectiveTo == null || rd.EffectiveTo > DateTime.Now))
                .Select(rd => GetShortDayName(rd.DayName))
                .Distinct()
                .ToListAsync();

            var myOverride = teamMember.TeamMemberOverride;
            var myOverrideDays = overrideDays.Where(r => r.TeamMemberId == teamMember.Id).Select(r => GetShortDayName(r.DayName)).Distinct().ToList();

            var effectiveReportingDays = (myOverride != null && myOverride.CustomReportingDays && myOverrideDays.Any())
            ? myOverrideDays
            : baseTeamReportingDays;

            bool myExplicitCustomShift =
                myOverride != null &&
                myOverride.CustomShift;

            int? myEffectiveShiftId;
            string? myEffectiveShiftName;

            if (myExplicitCustomShift)
            {
                // Individual shift assigned OR explicitly unassigned
                myEffectiveShiftId = myOverride!.OverrideShiftId;

                myEffectiveShiftName = myOverride.OverrideShiftId.HasValue
                    ? myOverride.OverrideShift?.ShiftName
                    : null;
            }
            else
            {
                // No individual override -> inherit team/roster shift
                var myRoster = rostersToday
                    .FirstOrDefault(r => r.Employee_Id == employeeId);

                myEffectiveShiftId =
                    myRoster?.ShiftId ?? team.ShiftId;

                myEffectiveShiftName =
                    (myRoster != null
                        ? allShifts.FirstOrDefault(
                            s => s.ShiftId == myRoster.ShiftId
                        )?.ShiftName
                        : null)
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
                members = memberDtos
            });
        }



        public async Task<IActionResult> ExportTeams()
        {
            // ==========================================
            // 1. GET ALL TEAMS
            // ==========================================

            var teams = await _context.Teams
                .Include(x => x.Members)
                    .ThenInclude(m => m.Employee)
                .AsNoTracking()
                .OrderBy(x => x.TeamNumber)
                .ToListAsync();

            if (!teams.Any())
                return new NotFoundObjectResult("No teams found.");


            // ==========================================
            // 2. GET REPORTING DAY HISTORY
            // ==========================================

            var teamIds = teams
                .Select(x => x.Id)
                .ToList();

            var reportingDayHistory = await _context.TeamReportingDays
                .Where(x => teamIds.Contains(x.TeamId))
                .AsNoTracking()
                .OrderBy(x => x.TeamId)
                .ThenBy(x => x.EffectiveFrom)
                .ToListAsync();


            // ==========================================
            // 3. GET DATE RANGE
            // ==========================================

            // Ignore invalid default dates (year 0001), which can otherwise
            // create thousands of weekly worksheets and make export hang.
            var firstDate = reportingDayHistory
                .Where(x => x.EffectiveFrom >= new DateTime(2000, 1, 1))
                .Select(x => x.EffectiveFrom.Date)
                .DefaultIfEmpty(DateTime.Today)
                .Min();

            var lastDate = DateTime.Today;


            // ==========================================
            // 4. CREATE WORKBOOK
            // ==========================================

            using var workbook = new XLWorkbook();


            // ==========================================
            // 5. FIND FIRST MONDAY
            // ==========================================

            var weekStart = firstDate;

            while (weekStart.DayOfWeek != DayOfWeek.Monday)
            {
                weekStart = weekStart.AddDays(-1);
            }


            // ==========================================
            // 6. CREATE ONE SHEET PER WEEK
            // ==========================================

            while (weekStart <= lastDate)
            {
                var weekEnd = weekStart.AddDays(6);

                // Don't go beyond today
                var displayWeekEnd =
                    weekEnd > lastDate
                        ? lastDate
                        : weekEnd;


                // ==========================================
                // SHEET NAME
                // ==========================================


                // Include the year to distinguish weeks across different years
                var sheetName =
                    $"{weekStart:dd-MMM-yyyy} to {displayWeekEnd:dd-MMM-yyyy}";

                // Excel worksheet names have a maximum length of 31 characters
                if (sheetName.Length > 31)
                    sheetName = sheetName.Substring(0, 31);

                // Ensure worksheet names are unique
                var baseSheetName = sheetName;
                int suffix = 1;

                while (workbook.Worksheets.Any(ws =>
                    string.Equals(
                        ws.Name,
                        sheetName,
                        StringComparison.OrdinalIgnoreCase)))
                {
                    var suffixText = $" ({suffix++})";
                    sheetName = baseSheetName.Substring(
                        0,
                        Math.Min(baseSheetName.Length, 31 - suffixText.Length))
                        + suffixText;
                }

                var worksheet = workbook.Worksheets.Add(sheetName);



                // ==========================================
                // HEADER
                // ==========================================

                worksheet.Cell(1, 1).Value = "Team No";
                worksheet.Cell(1, 2).Value = "Team Name";
                worksheet.Cell(1, 3).Value = "Reporting Days";
                worksheet.Cell(1, 4).Value = "Employee ID";
                worksheet.Cell(1, 5).Value = "Employee Name";

                var header = worksheet.Range(1, 1, 1, 5);

                header.Style.Font.Bold = true;
                header.Style.Font.FontColor = XLColor.White;
                header.Style.Fill.BackgroundColor = XLColor.DarkBlue;

                header.Style.Alignment.Horizontal =
                    XLAlignmentHorizontalValues.Center;

                header.Style.Alignment.Vertical =
                    XLAlignmentVerticalValues.Center;


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


                // ==========================================
                // 7. LOOP TEAMS
                // ==========================================

                foreach (var team in teams)
                {
                    // ------------------------------------------
                    // Get history for this team
                    // ------------------------------------------

                    var teamHistory = reportingDayHistory
                        .Where(x => x.TeamId == team.Id)
                        .OrderBy(x => x.EffectiveFrom)
                        .ToList();


                    // ------------------------------------------
                    // Determine reporting days for this week
                    // ------------------------------------------

                    var activeHistory = teamHistory
                        .Where(x =>
                            x.EffectiveFrom <= displayWeekEnd.AddDays(1).AddTicks(-1) &&
                            (x.EffectiveTo == null ||
                             x.EffectiveTo > weekStart))
                        .ToList();


                    // ------------------------------------------
                    // Important:
                    // Select the latest configuration that
                    // applies to this week.
                    // ------------------------------------------

                    var latestEffectiveFrom = activeHistory
                        .Select(x => x.EffectiveFrom)
                        .Distinct()
                        .OrderByDescending(x => x)
                        .FirstOrDefault();


                    var reportingDays = activeHistory
                        .Where(x =>
                            x.EffectiveFrom == latestEffectiveFrom)
                        .Select(x => GetShortDayName(x.DayName))
                        .Distinct()
                        .ToList();


                    var reportingDaysText =
                        string.Join(", ", reportingDays);


                    // ==========================================
                    // EMPLOYEES
                    // ==========================================

                    var employees = team.Members
                        .Where(m => m.Employee != null)
                        .Select(m => new
                        {
                            EmployeeId = m.Employee!.Employee_Id,
                            EmployeeName = m.Employee.Name
                        })
                        .Where(x =>
                            !string.IsNullOrWhiteSpace(x.EmployeeId) ||
                            !string.IsNullOrWhiteSpace(x.EmployeeName))
                        .Distinct()
                        .OrderBy(x => x.EmployeeName)
                        .ToList();


                    // ==========================================
                    // TEAM WITHOUT EMPLOYEES
                    // ==========================================

                    if (!employees.Any())
                    {
                        worksheet.Cell(row, 1).Value =
                            team.TeamNumber ?? "";

                        worksheet.Cell(row, 2).Value =
                            team.TeamName ?? "";

                        worksheet.Cell(row, 3).Value =
                            reportingDaysText;

                        worksheet.Cell(row, 4).Value = "";
                        worksheet.Cell(row, 5).Value = "";

                        var range =
                            worksheet.Range(row, 1, row, 5);

                        range.Style.Fill.BackgroundColor =
                            teamColors[colorIndex % teamColors.Length];

                        range.Style.Font.Bold = true;

                        range.Style.Border.OutsideBorder =
                            XLBorderStyleValues.Thin;

                        range.Style.Border.InsideBorder =
                            XLBorderStyleValues.Thin;

                        row++;
                    }
                    else
                    {
                        // ==========================================
                        // EMPLOYEE ROWS
                        // ==========================================

                        int startRow = row;

                        foreach (var employee in employees)
                        {
                            worksheet.Cell(row, 1).Value =
                                team.TeamNumber ?? "";

                            worksheet.Cell(row, 2).Value =
                                team.TeamName ?? "";

                            worksheet.Cell(row, 3).Value =
                                reportingDaysText;

                            worksheet.Cell(row, 4).Value =
                                employee.EmployeeId ?? "";

                            worksheet.Cell(row, 5).Value =
                                employee.EmployeeName ?? "";

                            row++;
                        }


                        int endRow = row - 1;


                        // ==========================================
                        // TEAM BLOCK FORMATTING
                        // ==========================================

                        var teamRange =
                            worksheet.Range(
                                startRow,
                                1,
                                endRow,
                                5);

                        teamRange.Style.Fill.BackgroundColor =
                            teamColors[colorIndex % teamColors.Length];

                        teamRange.Style.Border.OutsideBorder =
                            XLBorderStyleValues.Thin;

                        teamRange.Style.Border.InsideBorder =
                            XLBorderStyleValues.Thin;

                        worksheet.Range(
                            startRow,
                            1,
                            endRow,
                            3)
                            .Style.Font.Bold = true;
                    }


                    // Blank row between teams
                    row += 2;

                    colorIndex++;
                }


                // ==========================================
                // 8. FORMAT SHEET
                // ==========================================

                worksheet.Column(1).Width = 15;
                worksheet.Column(2).Width = 30;
                worksheet.Column(3).Width = 35;
                worksheet.Column(4).Width = 20;
                worksheet.Column(5).Width = 30;

                worksheet.RangeUsed()
                    .Style.Alignment.WrapText = true;

                worksheet.RangeUsed()
                    .Style.Alignment.Vertical =
                        XLAlignmentVerticalValues.Center;

                worksheet.SheetView.FreezeRows(1);


                // ==========================================
                // 9. NEXT WEEK
                // ==========================================

                weekStart = weekStart.AddDays(7);
            }


            // ==========================================
            // 10. RETURN EXCEL
            // ==========================================

            using var stream = new MemoryStream();

            workbook.SaveAs(stream);

            return new FileContentResult(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            {
                FileDownloadName =
                    $"Teams_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx"
            };
        }

        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto)
        {
            try
            {
                TeamMember? member = null;

                // 1. First try TeamMemberId
                if (dto.TeamMemberId > 0)
                {
                    member = await _context.TeamMembers
                        .FirstOrDefaultAsync(x => x.Id == dto.TeamMemberId);
                }

                // 2. If not found, try TeamId + EmployeeId
                if (member == null &&
                    dto.TeamId > 0 &&
                    !string.IsNullOrWhiteSpace(dto.EmployeeId))
                {
                    var empId = dto.EmployeeId.Trim();

                    member = await _context.TeamMembers
                        .FirstOrDefaultAsync(x =>
                            x.TeamId == dto.TeamId &&
                            x.EmployeeId == empId);
                }

                // 3. Last fallback: EmployeeId only
                if (member == null &&
                    !string.IsNullOrWhiteSpace(dto.EmployeeId))
                {
                    var empId = dto.EmployeeId.Trim();

                    member = await _context.TeamMembers
                        .FirstOrDefaultAsync(x =>
                            x.EmployeeId == empId);
                }

                if (member == null)
                {
                    return new NotFoundObjectResult(new
                    {
                        message = "Team Member not found.",
                        teamMemberId = dto.TeamMemberId,
                        teamId = dto.TeamId,
                        employeeId = dto.EmployeeId
                    });
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

                // =========================================================================
                // KEY FIX: ASSIGN VS UNASSIGN LOGIC
                // =========================================================================
                if (dto.OverrideShiftId.HasValue && dto.OverrideShiftId.Value > 0)
                {
                    // Case A: Assign individual shift
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = dto.OverrideShiftId.Value;
                }
                else
                {
                    // Case B: Unassign shift (explicitly unassigned / No Shift)
                    overrideData.CustomShift = true;
                    overrideData.OverrideShiftId = null;

                    // Deactivate any active direct shift assignments for this employee
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

                // Update Custom Reporting Days
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

                // Clear attendance cache so attendance updates immediately
                AttendanceService.ClearShiftCache(member.EmployeeId);

                await _notificationService.CreateNotification(
                "Team Configuration Updated",
                "Your reporting configuration has been updated.");

                return new OkObjectResult("Member Override Updated Successfully.");
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult(ex.ToString());
            }
        }
    }
}
