using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

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
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.Appraisals
                .Include(x => x.PerformanceCycle)
                .AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query.ToListAsync());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetEmployee(string employeeId)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.Appraisals
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
        [Authorize(Roles = "Employee,Manager,HR,HR Admin,Hr,Admin")]
        public async Task<IActionResult> Create(CreateAppraisalDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            int? targetOrgId = orgId ?? dto.OrganizationId;

            if (!targetOrgId.HasValue && !string.IsNullOrWhiteSpace(dto.Employee_Id))
            {
                var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Employee_Id == dto.Employee_Id);
                targetOrgId = emp?.OrganizationId;
            }

            var appraisal = new Appraisal
            {
                OrganizationId = targetOrgId,
                Employee_Id = dto.Employee_Id,
                PerformanceCycleId = dto.PerformanceCycleId,
                SelfRating = dto.SelfRating,
                EmployeeRemarks = dto.EmployeeRemarks,
                Status = " Self Submitted"
            };

            _context.Appraisals.Add(appraisal);
            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpPost("manager-review/{id}")]
        [Authorize(Roles = "Manager,Admin")]
        public async Task<IActionResult> ManagerReview(
            int id,
            int managerRating,
            string remarks)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var appraisal = await _context.Appraisals
                .FirstOrDefaultAsync(x => x.AppraisalId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (appraisal == null)
                return NotFound();

            appraisal.ManagerRating = managerRating;
            appraisal.ManagerRemarks = remarks;
            appraisal.Status = "Manager Reviewed";

            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpPost("hr-review/{id}")]
        [Authorize(Roles = "HR,HR Admin,Hr,Admin")]
        public async Task<IActionResult> HrReview(
            int id,
            int finalRating,
            decimal hike,
            bool promotion,
            string remarks)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var appraisal = await _context.Appraisals
                .FirstOrDefaultAsync(x => x.AppraisalId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (appraisal == null)
                return NotFound();

            appraisal.FinalRating = finalRating;
            appraisal.HRRemarks = remarks;
            appraisal.SalaryHikePercentage = hike;
            appraisal.PromotionRecommended = promotion;
            appraisal.ReviewedOn = DateTime.Now;
            appraisal.Status = "HR Reviewed";

            await _context.SaveChangesAsync();

            return Ok(appraisal);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var appraisal = await _context.Appraisals
                .FirstOrDefaultAsync(x => x.AppraisalId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (appraisal == null)
                return NotFound();

            _context.Appraisals.Remove(appraisal);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}