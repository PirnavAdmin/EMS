using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize]
[ApiController]
[Route("api/user-dashboard")]
public class UserDashboardController : ControllerBase
{
    private readonly IUserDashboardService _service;

    public UserDashboardController(IUserDashboardService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        var data = await _service.GetUserDashboard(User);
        return Ok(data);
    }
}