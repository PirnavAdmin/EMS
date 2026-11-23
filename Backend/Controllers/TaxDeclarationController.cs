using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TaxDeclarationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaxDeclarationController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.AsQueryable();

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            return Ok(await query
                .OrderByDescending(x => x.TaxDeclarationId)
                .ToListAsync());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.Where(x => x.Employee_Id == employeeId);

            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var data = await query.ToListAsync();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaxDeclaration model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Employee_Id == model.Employee_Id);

            if (employee != null && orgId.HasValue && orgId.Value > 0 && employee.OrganizationId != orgId.Value)
            {
                return Forbid();
            }

            model.OrganizationId = orgId ?? employee?.OrganizationId;
            model.CreatedDate = DateTime.Now;
            model.Status = "Draft";

            _context.TaxDeclarations.Add(model);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Tax Declaration Created Successfully"
            });
        }

        [HttpPut]
        public async Task<IActionResult> Update([FromBody] TaxDeclaration model)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var declaration = await query.FirstOrDefaultAsync(x => x.TaxDeclarationId == model.TaxDeclarationId);

            if (declaration == null)
                return NotFound();

            declaration.Regime = model.Regime;
            declaration.TotalDeclaredAmount = model.TotalDeclaredAmount;
            declaration.Remarks = model.Remarks;

            await _context.SaveChangesAsync();

            return Ok("Updated Successfully");
        }

        [HttpPost("submit/{id}")]
        public async Task<IActionResult> Submit(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var declaration = await query.FirstOrDefaultAsync(x => x.TaxDeclarationId == id);

            if (declaration == null)
                return NotFound();

            declaration.Status = "Submitted";
            declaration.SubmittedOn = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok("Submitted Successfully");
        }

        [HttpPost("approve/{id}")]
        public async Task<IActionResult> Approve(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var declaration = await query.FirstOrDefaultAsync(x => x.TaxDeclarationId == id);

            if (declaration == null)
                return NotFound();

            declaration.Status = "Approved";
            declaration.ApprovedOn = DateTime.Now;
            declaration.ApprovedBy = "Admin";

            await _context.SaveChangesAsync();

            return Ok("Approved Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            var query = _context.TaxDeclarations.AsQueryable();
            if (orgId.HasValue && orgId.Value > 0)
            {
                query = query.Where(x => x.OrganizationId == orgId.Value);
            }

            var declaration = await query.FirstOrDefaultAsync(x => x.TaxDeclarationId == id);

            if (declaration == null)
                return NotFound();

            _context.TaxDeclarations.Remove(declaration);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}