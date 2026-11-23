using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BranchesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BranchesController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<int> GetCurrentOrgIdAsync()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            if (!orgId.HasValue || orgId.Value <= 0)
            {
                throw new UnauthorizedAccessException("Organization context could not be resolved.");
            }
            return orgId.Value;
        }

        // ✅ 1. CREATE BRANCH
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BranchDto dto)
        {
            int orgId = await GetCurrentOrgIdAsync();

            var branch = new Branch
            {
                OrganizationId = orgId, // 🔥 Scoped to current org
                BranchName = dto.BranchName,
                Established = dto.Established,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Branch_Id = dto.Branch_Id
            };

            await _context.Branches.AddAsync(branch);
            await _context.SaveChangesAsync();

            return Ok(branch);
        }

        // ✅ 2. GET ALL BRANCHES
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            int orgId = await GetCurrentOrgIdAsync();

            var branches = await _context.Branches
                .AsNoTracking()
                .Where(b => b.OrganizationId == orgId) // 🔥 Isolated
                .ToListAsync();

            return Ok(branches);
        }

        // ✅ 3. GET BRANCH BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            int orgId = await GetCurrentOrgIdAsync();

            var branch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId); // 🔥 Ownership check

            if (branch == null)
                return NotFound(new { message = "Branch not found" });

            return Ok(branch);
        }

        // ✅ 4. UPDATE BRANCH
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] BranchDto dto)
        {
            int orgId = await GetCurrentOrgIdAsync();

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId); // 🔥 Ownership check

            if (branch == null)
                return NotFound(new { message = "Branch not found" });

            branch.BranchName = dto.BranchName;
            branch.Established = dto.Established;
            branch.PhoneNumber = dto.PhoneNumber;
            branch.Email = dto.Email;
            branch.Branch_Id = dto.Branch_Id;

            await _context.SaveChangesAsync();

            return Ok(branch);
        }

        // ✅ 5. DELETE BRANCH
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            int orgId = await GetCurrentOrgIdAsync();

            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == orgId); // 🔥 Ownership check

            if (branch == null)
                return NotFound(new { message = "Branch not found" });

            _context.Branches.Remove(branch);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Branch deleted successfully."
            });
        }
    }
}
