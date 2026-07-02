using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
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
        public async Task<IActionResult> Create(CreateTeamDto dto)
        {
            return await _service.CreateTeam(dto);
        }

        [HttpGet]
        public async Task<IActionResult> GetTeams()
        {
            return await _service.GetTeams();
        }

        [HttpGet("{teamId}")]
        public async Task<IActionResult> GetDetails(int teamId)
        {
            return await _service.GetTeamDetails(teamId);
        }

        [HttpPut("update")]
        public async Task<IActionResult> UpdateTeam(UpdateTeamDto dto)
        {
            return await _service.UpdateTeam(dto);
        }

        [HttpDelete("{teamId}")]
        public async Task<IActionResult> DeleteTeam(int teamId)
        {
            return await _service.DeleteTeam(teamId);
        }

        [HttpPost("add-members")]
        public async Task<IActionResult> AddMembers(AddTeamMembersDto dto)
        {
            return await _service.AddMembers(dto);
        }

        [HttpDelete("{teamId}/member/{employeeId}")]
        public async Task<IActionResult> RemoveMember(int teamId, string employeeId)
        {
            return await _service.RemoveMember(teamId, employeeId);
        }

        [HttpPut("update-reporting-days")]
        public async Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto)
        {
            return await _service.UpdateReportingDays(dto);
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
    }
}