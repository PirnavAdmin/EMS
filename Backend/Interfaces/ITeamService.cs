using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeManagementSystem.Interfaces
{
    public interface ITeamService
    {
        Task<IActionResult> CreateTeam(CreateTeamDto dto, ClaimsPrincipal? user = null);

        Task<IActionResult> GetTeams(ClaimsPrincipal? user = null);

        Task<IActionResult> GetTeamDetails(int teamId, ClaimsPrincipal? user = null, DateTime? date = null);
        Task<IActionResult> UpdateTeam(UpdateTeamDto dto, ClaimsPrincipal? user = null);
        Task<IActionResult> DeleteTeam(int teamId, ClaimsPrincipal? user = null);
        Task<IActionResult> UpdateTeamWeeklyOff(UpdateTeamWeeklyOffDto dto, ClaimsPrincipal? user = null);
        Task<IActionResult> UpdateReportingDays(UpdateReportingDaysDto dto, ClaimsPrincipal? user = null);
        Task<IActionResult> MemberOverride(MemberOverrideDto dto, ClaimsPrincipal? user = null);
        Task<IActionResult> AddMembers(AddTeamMembersDto dto, ClaimsPrincipal? user = null);
        Task<IActionResult> RemoveMember(int teamId, string employeeId, ClaimsPrincipal? user = null);
        Task<IActionResult> GetAvailableEmployees(ClaimsPrincipal? user = null);

        Task<IActionResult> GetManagers(ClaimsPrincipal? user = null);
        Task<IActionResult> GetProjectTeams(ClaimsPrincipal? user = null);

        Task<IActionResult> GetMyTeam(ClaimsPrincipal? user = null, DateTime? date = null);
        Task<IActionResult> ExportTeams(ClaimsPrincipal? user = null);

        
    }
}
