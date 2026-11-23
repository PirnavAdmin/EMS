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
    public class TaxDeclarationItemController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaxDeclarationItemController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<(bool allowed, TaxDeclaration? declaration)> CanAccessDeclarationAsync(int declarationId)
        {
            var declaration = await _context.TaxDeclarations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.TaxDeclarationId == declarationId);
            if (declaration == null)
                return (false, null);

            var (orgId, adminIds) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
            bool inTenant = false;
            if (orgId.HasValue && orgId.Value > 0)
            {
                if (declaration.OrganizationId.HasValue && declaration.OrganizationId.Value == orgId.Value)
                    inTenant = true;
                else
                    inTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, declaration.Employee_Id);
            }
            else if (adminIds != null && adminIds.Any())
            {
                inTenant = await _context.Employees
                    .AnyAsync(e => e.Employee_Id == declaration.Employee_Id && e.AdminId.HasValue && adminIds.Contains(e.AdminId.Value));
            }

            if (!inTenant)
                return (false, null);

            var currentEmpId = CurrentUserHelper.GetEmployeeId(User);
            bool isAdmin = await CurrentUserHelper.IsAdminUserAsync(_context, User);
            if (!isAdmin && !string.IsNullOrWhiteSpace(currentEmpId) && !string.Equals(declaration.Employee_Id, currentEmpId, StringComparison.OrdinalIgnoreCase))
            {
                return (false, null);
            }

            return (true, declaration);
        }

        [HttpGet("{declarationId}")]
        public async Task<IActionResult> GetItems(int declarationId)
        {
            var (allowed, _) = await CanAccessDeclarationAsync(declarationId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration not found in your organization." });

            var items = await _context.TaxDeclarationItems
                .Where(x => x.TaxDeclarationId == declarationId)
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> AddItem([FromBody] TaxDeclarationItem model)
        {
            var (allowed, _) = await CanAccessDeclarationAsync(model.TaxDeclarationId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration not found in your organization." });

            _context.TaxDeclarationItems.Add(model);
            await _context.SaveChangesAsync();

            return Ok("Item Added Successfully");
        }

        [HttpPut]
        public async Task<IActionResult> UpdateItem([FromBody] TaxDeclarationItem model)
        {
            var item = await _context.TaxDeclarationItems
                .FindAsync(model.ItemId);

            if (item == null)
                return NotFound();

            var (allowed, _) = await CanAccessDeclarationAsync(item.TaxDeclarationId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration not found in your organization." });

            item.SectionName = model.SectionName;
            item.SectionCode = model.SectionCode;
            item.DeclaredAmount = model.DeclaredAmount;
            item.ApprovedAmount = model.ApprovedAmount;

            await _context.SaveChangesAsync();

            return Ok("Updated Successfully");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var item = await _context.TaxDeclarationItems.FindAsync(id);

            if (item == null)
                return NotFound();

            var (allowed, _) = await CanAccessDeclarationAsync(item.TaxDeclarationId);
            if (!allowed)
                return NotFound(new { message = "Tax declaration not found in your organization." });

            _context.TaxDeclarationItems.Remove(item);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}
