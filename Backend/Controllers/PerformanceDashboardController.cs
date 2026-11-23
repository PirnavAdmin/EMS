using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PerformanceDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PerformanceDashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Dashboard()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            var empQuery = _context.Employees.AsNoTracking();
            var goalQuery = _context.EmployeeGoals.AsNoTracking();
            var appraisalQuery = _context.Appraisals.AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                empQuery = empQuery.Where(x => x.OrganizationId == orgId.Value);
                goalQuery = goalQuery.Where(x => x.OrganizationId == orgId.Value);
                appraisalQuery = appraisalQuery.Where(x => x.OrganizationId == orgId.Value);
            }

            var totalEmployees =
                await empQuery.CountAsync();

            var totalGoals =
                await goalQuery.CountAsync();

            var completedGoals =
                await goalQuery
                    .CountAsync(x => x.Status == "Completed");

            var pendingReviews =
                await appraisalQuery
                    .CountAsync(x => x.Status != "Completed");

            var avgRating =
                await appraisalQuery
                    .AverageAsync(x => (double?)x.FinalRating) ?? 0;

            var topPerformers =
                await appraisalQuery
                    .OrderByDescending(x => x.FinalRating)
                    .Take(10)
                    .ToListAsync();

            return Ok(new
            {
                TotalEmployees = totalEmployees,
                TotalGoals = totalGoals,
                CompletedGoals = completedGoals,
                PendingReviews = pendingReviews,
                AverageRating = avgRating,
                TopPerformers = topPerformers
            });
        }
    }
}