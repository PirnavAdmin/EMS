using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _context;

    public HolidaysController(AppDbContext context)
    {
        _context = context;
    }

    private async Task<int> GetCurrentOrgIdAsync()
    {
        var (orgId, _) = await CurrentUserHelper.GetTenantContextAsync(_context, User);
        if (!orgId.HasValue || orgId.Value <= 0)
        {
            throw new UnauthorizedAccessException("OrganizationId not found in token.");
        }
        return orgId.Value;
    }

    // ✅ 1. GET ALL HOLIDAYS
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        int orgId = await GetCurrentOrgIdAsync();

        var holidays = await _context.Holidays
            .AsNoTracking()
            .Where(h => h.OrganizationId == orgId) // 🔥 Isolated
            .OrderBy(h => h.Holiday_Date)
            .Select(h => new HolidayDto
            {
                Id = h.Id,
                Holiday_Name = h.Holiday_Name,
                Holiday_Date = h.Holiday_Date,
                Day = h.Day,
                Type = h.Type,
                OrganizationId = h.OrganizationId
            })
            .ToListAsync();

        return Ok(holidays);
    }

    // ✅ 2. CREATE HOLIDAY
    [HttpPost]
    public async Task<IActionResult> Create(HolidayDto dto)
    {
        int orgId = await GetCurrentOrgIdAsync();

        var holiday = new Holiday
        {
            OrganizationId = orgId, // 🔥 Scoped to current org
            Holiday_Name = dto.Holiday_Name,
            Holiday_Date = dto.Holiday_Date,
            Day = dto.Day,
            Type = dto.Type,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Holidays.AddAsync(holiday);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Holiday created successfully", id = holiday.Id });
    }

    // ✅ 3. UPDATE HOLIDAY
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, HolidayDto dto)
    {
        int orgId = await GetCurrentOrgIdAsync();

        var holiday = await _context.Holidays
            .FirstOrDefaultAsync(h => h.Id == id && h.OrganizationId == orgId); // 🔥 Ownership check

        if (holiday == null)
            return NotFound(new { message = "Holiday not found" });

        holiday.Holiday_Name = dto.Holiday_Name;
        holiday.Holiday_Date = dto.Holiday_Date;
        holiday.Day = dto.Day;
        holiday.Type = dto.Type;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Updated Successfully" });
    }

    // ✅ 4. DELETE HOLIDAY
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        int orgId = await GetCurrentOrgIdAsync();

        var holiday = await _context.Holidays
            .FirstOrDefaultAsync(h => h.Id == id && h.OrganizationId == orgId); // 🔥 Ownership check

        if (holiday == null)
            return NotFound(new { message = "Holiday not found" });

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Deleted Successfully" });
    }
}
