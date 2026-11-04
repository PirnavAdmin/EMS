using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
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
            return Ok(await _context.PerformanceCycles
                .OrderByDescending(x => x.PerformanceCycleId)
                .ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var data = await _context.PerformanceCycles.FindAsync(id);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreatePerformanceCycleDto dto)
        {
            var cycle = new PerformanceCycle
            {
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
            var data = await _context.PerformanceCycles.FindAsync(id);

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
            var data = await _context.PerformanceCycles.FindAsync(id);

            if (data == null)
                return NotFound();

            _context.PerformanceCycles.Remove(data);
            await _context.SaveChangesAsync();

            return Ok("Deleted Successfully");
        }
    }
}