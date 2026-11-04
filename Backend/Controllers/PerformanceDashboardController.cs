using EmployeeManagementSystem.Data;
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
            var totalEmployees =
                await _context.Employees.CountAsync();

            var totalGoals =
                await _context.EmployeeGoals.CountAsync();

            var completedGoals =
                await _context.EmployeeGoals
                    .CountAsync(x => x.Status == "Completed");

            var pendingReviews =
                await _context.Appraisals
                    .CountAsync(x => x.Status != "Completed");

            var avgRating =
                await _context.Appraisals
                    .AverageAsync(x => (double?)x.FinalRating) ?? 0;

            var topPerformers =
                await _context.Appraisals
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