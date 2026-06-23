using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EmployeeManagementSystem.Data;

[ApiController]
[Route("api/[controller]")]
public class LeaveBalanceController : ControllerBase
{
    private readonly AppDbContext _context;

    public LeaveBalanceController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetBalance(string employeeId)
    {
        var balance = await _context.EmployeeLeaveBalances
            .FirstOrDefaultAsync(x => x.Employee_Id == employeeId);

        if (balance == null)
            return NotFound("Leave balance not found");

        return Ok(new
        {
            Earned = new
            {
                total = balance.Earned_Total,
                used = balance.Earned_Used,
                remaining = balance.Earned_Total - balance.Earned_Used
            },
            Casual = new
            {
                total = balance.Casual_Total,
                used = balance.Casual_Used,
                remaining = balance.Casual_Total - balance.Casual_Used
            },
            Sick = new
            {
                total = balance.Sick_Total,
                used = balance.Sick_Used,
                remaining = balance.Sick_Total - balance.Sick_Used
            }
        });
    }
}