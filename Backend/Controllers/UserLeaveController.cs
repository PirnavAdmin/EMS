using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManagementSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeLeaveController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeeLeaveController(AppDbContext context)
        {
            _context = context;
        }

        // Apply Leave
        [HttpPost("apply")]
        public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto)
        {
            var employeeId = User.FindFirst("Employee_Id")?.Value;

            var leave = new EmployeeLeave
            {
                EmployeeId = employeeId,
               
                LeaveType = dto.LeaveType,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                Reason = dto.Reason,
                AppliedDate = DateOnly.FromDateTime(DateTime.Now),
                Status = "Pending"
            };

            _context.EmployeeLeaves.Add(leave);
            await _context.SaveChangesAsync();

            return Ok("Leave applied successfully");
        }

        // Get logged in employee leaves
        [HttpGet("my-leaves")]
        public async Task<IActionResult> GetMyLeaves()
        {
            var employeeId = User.FindFirst("Employee_Id")?.Value;

            var leaves = await _context.EmployeeLeaves
                .Where(x => x.EmployeeId == employeeId)
                .ToListAsync();

            return Ok(leaves);
        }
    }
}