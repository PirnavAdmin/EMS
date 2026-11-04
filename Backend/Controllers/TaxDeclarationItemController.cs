using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaxDeclarationItemController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TaxDeclarationItemController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{declarationId}")]
        public async Task<IActionResult> GetItems(int declarationId)
        {
            var items = await _context.TaxDeclarationItems
                .Where(x => x.TaxDeclarationId == declarationId)
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> AddItem([FromBody] TaxDeclarationItem model)
        {
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

            _context.TaxDeclarationItems.Remove(item);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }

    }
}
