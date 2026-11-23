using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
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
            return Ok(await _context.TaxDeclarations
                .OrderByDescending(x => x.TaxDeclarationId)
                .ToListAsync());
        }

        [HttpGet("{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            var data = await _context.TaxDeclarations
                .Where(x => x.Employee_Id == employeeId)
                .ToListAsync();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TaxDeclaration model)
        {
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
            var declaration = await _context.TaxDeclarations
                .FindAsync(model.TaxDeclarationId);

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
            var declaration = await _context.TaxDeclarations.FindAsync(id);

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
            var declaration = await _context.TaxDeclarations.FindAsync(id);

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
            var declaration = await _context.TaxDeclarations.FindAsync(id);

            if (declaration == null)
                return NotFound();

            _context.TaxDeclarations.Remove(declaration);

            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}