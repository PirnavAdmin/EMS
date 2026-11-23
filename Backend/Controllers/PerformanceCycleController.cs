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
    public class PerformanceCycleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PerformanceCycleController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.PerformanceCycles.AsNoTracking();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query
                .OrderByDescending(x => x.PerformanceCycleId)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var data = await _context.PerformanceCycles
                .FirstOrDefaultAsync(x => x.PerformanceCycleId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreatePerformanceCycleDto dto)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);

            var cycle = new PerformanceCycle
            {
                OrganizationId = orgId ?? dto.OrganizationId,
                CycleName = dto.CycleName,
                FinancialYear = dto.FinancialYear,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = "Open",
                CreatedBy = "Admin",
                CreatedDate = DateTime.Now
            };

            _context.PerformanceCycles.Add(cycle);
            await _context.SaveChangesAsync();

            return Ok(cycle);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, PerformanceCycle model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var data = await _context.PerformanceCycles
                .FirstOrDefaultAsync(x => x.PerformanceCycleId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (data == null)
                return NotFound();

            data.CycleName = model.CycleName;
            data.FinancialYear = model.FinancialYear;
            data.StartDate = model.StartDate;
            data.EndDate = model.EndDate;
            data.Status = model.Status;

            await _context.SaveChangesAsync();

            return Ok(data);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var data = await _context.PerformanceCycles
                .FirstOrDefaultAsync(x => x.PerformanceCycleId == id && (!orgId.HasValue || x.OrganizationId == orgId.Value));

            if (data == null)
                return NotFound();

            _context.PerformanceCycles.Remove(data);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}