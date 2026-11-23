using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeGoalController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeeGoalController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.EmployeeGoals
                .Include(x => x.PerformanceCycle)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query.ToListAsync());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployeeGoals(string employeeId)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.EmployeeGoals
                .Where(x => x.Employee_Id == employeeId)
                .Include(x => x.PerformanceCycle)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateEmployeeGoalDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            int? targetOrgId = orgId ?? dto.OrganizationId;

            if (!targetOrgId.HasValue && !string.IsNullOrWhiteSpace(dto.Employee_Id))
            {
                var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == dto.Employee_Id);
                targetOrgId = emp?.OrganizationId;
            }

            var goal = new EmployeeGoal
            {
                OrganizationId = targetOrgId,
                Employee_Id = dto.Employee_Id,
                PerformanceCycleId = dto.PerformanceCycleId,
                GoalTitle = dto.GoalTitle,
                GoalDescription = dto.GoalDescription,
                Weightage = dto.Weightage,
                TargetValue = dto.TargetValue,
                ProgressPercentage = 0,
                Status = "Pending",
                CreatedDate = DateTime.Now
            };

            _context.EmployeeGoals.Add(goal);
            await _context.SaveChangesAsync();

            return Ok(goal);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, EmployeeGoal model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var goal = await _context.EmployeeGoals
                .FirstOrDefaultAsync(x => x.GoalId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (goal == null)
                return NotFound();

            goal.GoalTitle = model.GoalTitle;
            goal.GoalDescription = model.GoalDescription;
            goal.TargetValue = model.TargetValue;
            goal.AchievementValue = model.AchievementValue;
            goal.ProgressPercentage = model.ProgressPercentage;
            goal.Status = model.Status;

            await _context.SaveChangesAsync();

            return Ok(goal);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var goal = await _context.EmployeeGoals
                .FirstOrDefaultAsync(x => x.GoalId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (goal == null)
                return NotFound();

            _context.EmployeeGoals.Remove(goal);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}