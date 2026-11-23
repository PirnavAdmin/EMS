using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TeamController : ControllerBase
    {
        private readonly ITeamService _service;

        public TeamController(ITeamService service)
        {
            _service = service;
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTeamDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Invalid request payload." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            return await _service.CreateTeam(dto, User);
        }

        [HttpGet]
        public async Task<IActionResult> GetTeams()
        {
            return await _service.GetTeams(User);
        }

        [HttpGet("{teamId}")]
        public async Task<IActionResult> GetDetails(int teamId, [FromQuery] DateTime? date = null)
        {
            return await _service.GetTeamDetails(teamId, User, date);
        }

        [HttpPut("update")]
        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto)
        {
            return await _service.UpdateTeam(dto, User);
        }

        [HttpDelete("{teamId}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            return await _service.DeleteTeam(teamId, User);
        }

        [HttpPost("add-members")]
        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto)
        {
            return await _service.AddMembers(dto, User);
        }

        [HttpDelete("{teamId}/member/{employeeId}")]
        public async Task<IActionResult> RemoveMember(int teamId, string employeeId)
        {
            return await _service.RemoveMember(teamId, employeeId, User);
        }

        [HttpPut("update-weekly-off")]
        public async Task<IActionResult> UpdateWeeklyOff(UpdateTeamWeeklyOffDto dto)
        {
            return await _service.UpdateTeamWeeklyOff(dto, User);
        }

        [HttpPut("update-reporting-days")]
        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto)
        {
            return await _service.UpdateReportingDays(dto, User);
        }

        [HttpPut("member-override")]
        public async Task<IActionResult> MemberOverride(MemberOverrideDto dto)
        {
            return await _service.MemberOverride(dto, User);
        }

        [HttpGet("available-employees")]
        public async Task<IActionResult> GetAvailableEmployees()
        {
            return await _service.GetAvailableEmployees(User);
        }

        [HttpGet("managers")]
        public async Task<IActionResult> GetManagers()
        {
            return await _service.GetManagers(User);
        }

        [HttpGet("project-teams")]
        public async Task<IActionResult> GetProjectTeams()
        {
            return await _service.GetProjectTeams(User);
        }

        [HttpGet("export")]
        public async Task<IActionResult> ExportTeams()
        {
            return await _service.ExportTeams(User);
        }

        [HttpGet("my-team")]
        public async Task<IActionResult> GetMyTeam([FromQuery] DateTime? date = null)
        {
            return await _service.GetMyTeam(User, date);
        }
    }
}
