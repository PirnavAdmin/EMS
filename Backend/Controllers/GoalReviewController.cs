using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoalReviewController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GoalReviewController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.GoalReviews
                .Include(x => x.Goal)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query.ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(GoalReview review)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            if (orgId.HasValue && orgId.Value > 0)
            {
                review.OrganizationId = orgId.Value;
            }
            else if (!review.OrganizationId.HasValue)
            {
                var goal = await _context.EmployeeGoals.AsNoTracking().FirstOrDefaultAsync(g => g.GoalId == review.GoalId);
                review.OrganizationId = goal?.OrganizationId;
            }

            review.ReviewedOn = DateTime.Now;

            _context.GoalReviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(review);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, GoalReview model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var review = await _context.GoalReviews
                .FirstOrDefaultAsync(x => x.ReviewId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (review == null)
                return NotFound();

            review.Reviewer = model.Reviewer;
            review.ReviewComments = model.ReviewComments;
            review.Rating = model.Rating;

            await _context.SaveChangesAsync();

            return Ok(review);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var review = await _context.GoalReviews
                .FirstOrDefaultAsync(x => x.ReviewId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (review == null)
                return NotFound();

            _context.GoalReviews.Remove(review);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}