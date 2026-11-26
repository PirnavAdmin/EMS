using EmployeeManagementSystem.Controllers;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Team management controller with comprehensive audit logging
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TeamController : ControllerBase
    {
        private readonly ITeamService _service;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service
        private readonly AppDbContext _context; // varsha - DB context for capturing pre-update state

        public TeamController(
            ITeamService service,
            IAuditLogService auditLogService,
            AppDbContext context) // varsha
        {
            _service = service;
            _auditLogService = auditLogService; // varsha
            _context = context; // varsha
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTeamDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request payload." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _service.CreateTeam(dto);

            // varsha - Audit team creation
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                await _auditLogService.LogCreateAsync(
                    module: "Teams",
                    entityName: "Team",
                    entityId: dto.TeamName,
                    description: $"Created team {dto.TeamName}",
                    newValues: dto,
                    user: User);
            }

            return result;
        }

        [HttpGet]
        public async Task<IActionResult> GetTeams()
        {
            return await _service.GetTeams();
        }

        [HttpGet("{teamId}")]
        public async Task<IActionResult> GetDetails(int teamId, [FromQuery] DateTime? date = null)
        {
            return await _service.GetTeamDetails(teamId, User, date);
        }

        [HttpPut("update")]
        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto)
        {
            // varsha - Fetch existing team state before update for accurate delta tracking
            var existingTeam = await _context.Teams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.TeamId);
            var oldValues = existingTeam != null ? new
            {
                existingTeam.TeamName,
                existingTeam.TeamNumber,
                existingTeam.ReportingManagerId,
                existingTeam.EngagementType,
                existingTeam.ProjectId,
                existingTeam.WeeklyOffDays
            } : null;

            var result = await _service.UpdateTeam(dto);

            // varsha - Audit team update with actual old and new values
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                await _auditLogService.LogUpdateAsync(
                    module: "Teams",
                    entityName: "Team",
                    entityId: dto.TeamId.ToString(),
                    description: $"Updated team {dto.TeamName} (ID: {dto.TeamId})",
                    oldValues: oldValues,
                    newValues: dto,
                    user: User);
            }

            return result;
        }

        [HttpDelete("{teamId}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            // varsha - Capture existing team state before deletion
            var existingTeam = await _context.Teams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == teamId);
            var oldValues = existingTeam != null ? new
            {
                existingTeam.TeamName,
                existingTeam.TeamNumber,
                existingTeam.ReportingManagerId,
                existingTeam.WeeklyOffDays
            } : null;

            var result = await _service.DeleteTeam(teamId);

            // varsha - Audit team deletion with pre-delete state preserved
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                await _auditLogService.LogDeleteAsync(
                    module: "Teams",
                    entityName: "Team",
                    entityId: teamId.ToString(),
                    description: $"Deleted team '{existingTeam?.TeamName}' (ID: {teamId})",
                    oldValues: oldValues,
                    user: User);
            }

            return result;
        }

        [HttpPost("add-members")]
        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto)
        {
            var result = await _service.AddMembers(dto);

            // varsha - Audit team member addition
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                await _auditLogService.LogActionAsync(
                    action: "AddTeamMembers",
                    module: "Teams",
                    entityName: "Team",
                    entityId: dto.TeamId.ToString(),
                    description: $"Added {dto.EmployeeIds.Count} members to team {dto.TeamId}",
                    newValues: dto,
                    statusCode: 200,
                    user: User);
            }

            return result;
        }

        [HttpDelete("{teamId}/member/{employeeId}")]
        public async Task<IActionResult> RemoveMember(int teamId, string employeeId)
        {
            var result = await _service.RemoveMember(teamId, employeeId);

            // varsha - Audit team member removal
            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                await _auditLogService.LogActionAsync(
                    action: "RemoveTeamMember",
                    module: "Teams",
                    entityName: "Team",
                    entityId: teamId.ToString(),
                    description: $"Removed employee {employeeId} from team {teamId}",
                    statusCode: 200,
                    user: User);
            }

            return result;
        }

        // varsha - Update weekly off days with full audit logging of old and new days
        [HttpPut("update-weekly-off")]
        public async Task<IActionResult> UpdateWeeklyOff(UpdateTeamWeeklyOffDto dto)
        {
            var existingTeam = await _context.Teams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.TeamId);
            var oldWeeklyOff = existingTeam?.WeeklyOffDays ?? "None";
            var oldValues = new { WeeklyOffDays = oldWeeklyOff };

            var result = await _service.UpdateTeamWeeklyOff(dto);

            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                var newWeeklyOff = dto.WeeklyOffDays != null && dto.WeeklyOffDays.Count > 0
                    ? string.Join(", ", dto.WeeklyOffDays)
                    : "None";
                var newValues = new { WeeklyOffDays = newWeeklyOff };

                await _auditLogService.LogUpdateAsync(
                    module: "Teams",
                    entityName: "TeamWeeklyOff",
                    entityId: dto.TeamId.ToString(),
                    description: $"Updated weekly off days for team {dto.TeamId} from [{oldWeeklyOff}] to [{newWeeklyOff}]",
                    oldValues: oldValues,
                    newValues: newValues,
                    user: User);
            }

            return result;
        }

        // varsha - Update reporting days with full audit logging of old and new reporting days
        [HttpPut("update-reporting-days")]
        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto)
        {
            var existingDays = await _context.TeamReportingDays.AsNoTracking()
                .Where(x => x.TeamId == dto.TeamId && x.EffectiveTo == null)
                .Select(x => x.DayName)
                .ToListAsync();

            var oldReportingDays = existingDays.Count > 0 ? string.Join(", ", existingDays) : "None";
            var oldValues = new { ReportingDays = oldReportingDays };

            var result = await _service.UpdateReportingDays(dto);

            if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
            {
                var newReportingDays = dto.ReportingDays != null && dto.ReportingDays.Count > 0
                    ? string.Join(", ", dto.ReportingDays)
                    : "None";
                var newValues = new { ReportingDays = newReportingDays };

                await _auditLogService.LogUpdateAsync(
                    module: "Teams",
                    entityName: "TeamReportingDays",
                    entityId: dto.TeamId.ToString(),
                    description: $"Updated reporting days for team {dto.TeamId} from [{oldReportingDays}] to [{newReportingDays}]",
                    oldValues: oldValues,
                    newValues: newValues,
                    user: User);
            }

            return result;
        }

        [HttpPut("member-override")]
        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto)
        {
            return await _service.MemberOverride(dto);
        }

        [HttpGet("available-employees")]
        public async Task<IActionResult> GetAvailableEmployees()
        {
            return await _service.GetAvailableEmployees();
        }

        [HttpGet("managers")]
        public async Task<IActionResult> GetManagers()
        {
            return await _service.GetManagers();
        }

        [HttpGet("project-teams")]
        public async Task<IActionResult> GetProjectTeams()
        {
            return await _service.GetProjectTeams();
        }

        [HttpGet("export")]
        public async Task<IActionResult> ExportTeams()
        {
            return await _service.ExportTeams();
        }
        [HttpGet("my-team")]
        public async Task<IActionResult> GetMyTeam([FromQuery] DateTime? date = null)
        {
            return await _service.GetMyTeam(User, date);
        }

        
    }
}
