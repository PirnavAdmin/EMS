using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppraisalController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AppraisalController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Appraisals
                .Include(x => x.PerformanceCycle)
                .ToListAsync());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployee(string employeeId)
        {
            return Ok(await _context.Appraisals
                .Where(x => x.Employee_Id == employeeId)
                .Include(x => x.PerformanceCycle)
                .ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateAppraisalDto dto)
        {
            var appraisal = new Appraisal
            {
                Employee_Id = dto.Employee_Id,
                PerformanceCycleId = dto.PerformanceCycleId,
                SelfRating = dto.SelfRating,
                ManagerRemarks = dto.ManagerRemarks,
                Status = "Submitted"
            };

            _context.Appraisals.Add(appraisal);

            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpPost("manager-review/{id}")]
        public async Task<IActionResult> ManagerReview(
            int id,
            int managerRating,
            string remarks)
        {
            var appraisal = await _context.Appraisals.FindAsync(id);

            if (appraisal == null)
                return NotFound();

            appraisal.ManagerRating = managerRating;
            appraisal.ManagerRemarks = remarks;
            appraisal.Status = "Manager Reviewed";

            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpPost("hr-review/{id}")]
        public async Task<IActionResult> HrReview(
            int id,
            int finalRating,
            decimal hike,
            bool promotion,
            string remarks)
        {
            var appraisal = await _context.Appraisals.FindAsync(id);

            if (appraisal == null)
                return NotFound();

            appraisal.FinalRating = finalRating;
            appraisal.HRRemarks = remarks;
            appraisal.SalaryHikePercentage = hike;
            appraisal.PromotionRecommended = promotion;
            appraisal.ReviewedOn = DateTime.Now;
            appraisal.Status = "Completed";

            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var appraisal = await _context.Appraisals.FindAsync(id);

            if (appraisal == null)
                return NotFound();

            _context.Appraisals.Remove(appraisal);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}