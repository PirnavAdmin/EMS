using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    // varsha - Holidays controller with complete Audit Logging
    //[Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class HolidaysController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService; // varsha - Audit logging service

        public HolidaysController(
            AppDbContext context,
            IAuditLogService auditLogService) // varsha
        {
            _context = context;
            _auditLogService = auditLogService; // varsha
        }

        // GET
        //[Permission(ModuleIds.Holidays, PermissionAction.View)]
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
        //[Permission(ModuleIds.Holidays, PermissionAction.Add)]
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

            // varsha - Audit holiday creation
            await _auditLogService.LogCreateAsync(
                module: "Holidays",
                entityName: "Holiday",
                entityId: holiday.Id.ToString(),
                description: $"Created holiday '{holiday.Holiday_Name}' on {holiday.Holiday_Date:yyyy-MM-dd}",
                newValues: dto,
                user: User);

            return Ok(dto);
        }

        // PUT
        //[Permission(ModuleIds.Holidays, PermissionAction.Edit)]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, HolidayDto dto)
        {
            var holiday = await _context.Holidays.FindAsync(id);

            if (holiday == null)
                return NotFound();

            // varsha - Capture existing holiday state before update
            var oldValues = new
            {
                holiday.Holiday_Name,
                Date = holiday.Holiday_Date.ToString("yyyy-MM-dd"),
                holiday.Day,
                holiday.Type
            };

            holiday.Holiday_Name = dto.Holiday_Name;
            holiday.Holiday_Date = dto.Holiday_Date;
            holiday.Day = dto.Day;
            holiday.Type = dto.Type;

            await _context.SaveChangesAsync();

            // varsha - Audit holiday update with delta
            await _auditLogService.LogUpdateAsync(
                module: "Holidays",
                entityName: "Holiday",
                entityId: id.ToString(),
                description: $"Updated holiday '{dto.Holiday_Name}'",
                oldValues: oldValues,
                newValues: dto,
                user: User);

            return Ok("Updated Successfully");
        }

        // DELETE
        //[Permission(ModuleIds.Holidays, PermissionAction.Delete)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var holiday = await _context.Holidays.FindAsync(id);

            if (holiday == null)
                return NotFound();

            // varsha - Capture existing holiday state before deletion
            var oldValues = new
            {
                holiday.Id,
                holiday.Holiday_Name,
                Date = holiday.Holiday_Date.ToString("yyyy-MM-dd"),
                holiday.Day,
                holiday.Type
            };

            _context.Holidays.Remove(holiday);
            await _context.SaveChangesAsync();

            // varsha - Audit holiday deletion
            await _auditLogService.LogDeleteAsync(
                module: "Holidays",
                entityName: "Holiday",
                entityId: id.ToString(),
                description: $"Deleted holiday '{holiday.Holiday_Name}'",
                oldValues: oldValues,
                user: User);

            return Ok("Deleted Successfully");
        }
    }
}