using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.Helpers;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class LeaveBalanceController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmployeeLeaveService _service;
    private readonly ILeaveBalanceService _leaveBalanceService;

   
    public LeaveBalanceController(AppDbContext context, IEmployeeLeaveService service,
        ILeaveBalanceService leaveBalanceService)
    {
        _context = context;
        _service = service;
        _leaveBalanceService = leaveBalanceService;
    }

    [HttpGet("balance/{employeeId}")]
    public async Task<IActionResult> GetLeaveBalanceByEmployeeId(
      string employeeId)
    {
        var isInTenant = await CurrentUserHelper.IsEmployeeInTenantAsync(_context, User, employeeId);
        if (!isInTenant)
        {
            return NotFound(new
            {
                message = "Employee not found"
            });
        }

        var result = await _leaveBalanceService
            .GetLeaveBalanceByEmployeeId(employeeId);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Employee not found"
            });
        }

        return Ok(result);
    }
    [HttpGet("my-leave-balance")]
    public async Task<IActionResult> GetMyLeaveBalance()
    {
        var result = await _leaveBalanceService
            .GetMyLeaveBalance(User);

        if (result == null)
        {
            return Unauthorized(new
            {
                message = "Employee not found or invalid token"
            });
        }

        return Ok(result);
    }
}
