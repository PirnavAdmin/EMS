using EmployeeManagementSystem.Data;
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
            return Ok(await _context.GoalReviews
                .Include(x => x.Goal)
                .ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(GoalReview review)
        {
            review.ReviewedOn = DateTime.Now;

            _context.GoalReviews.Add(review);

            await _context.SaveChangesAsync();

            return Ok(review);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, GoalReview model)
        {
            var review = await _context.GoalReviews.FindAsync(id);

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
            var review = await _context.GoalReviews.FindAsync(id);

            if (review == null)
                return NotFound();

            _context.GoalReviews.Remove(review);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}