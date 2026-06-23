using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _context;

    public HolidaysController(AppDbContext context)
    {
        _context = context;
    }

    // GET
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var holidays = await _context.Holidays
            .Select(h => new HolidayDto
            {
                Id = h.Id,
                Holiday_Name = h.Holiday_Name,
                Holiday_Date = h.Holiday_Date,
                Day = h.Day,
                Type = h.Type
            })
            .ToListAsync();

        return Ok(holidays);
    }

    // POST
    [HttpPost]
    public async Task<IActionResult> Create(HolidayDto dto)
    {
        var holiday = new Holiday
        {
            Holiday_Name = dto.Holiday_Name,
            Holiday_Date = dto.Holiday_Date,
            Day = dto.Day,
            Type = dto.Type
        };

        await _context.Holidays.AddAsync(holiday);
        await _context.SaveChangesAsync();

        return Ok(dto);
    }

    // PUT
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, HolidayDto dto)
    {
        var holiday = await _context.Holidays.FindAsync(id);

        if (holiday == null)
            return NotFound();
        
        holiday.Holiday_Name = dto.Holiday_Name;
        holiday.Holiday_Date = dto.Holiday_Date;
        holiday.Day = dto.Day;
        holiday.Type = dto.Type;

        await _context.SaveChangesAsync();

        return Ok("Updated Successfully");
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var holiday = await _context.Holidays.FindAsync(id);

        if (holiday == null)
            return NotFound();

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return Ok("Deleted Successfully");
    }
}