using DocumentFormat.OpenXml.Spreadsheet;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

[Authorize]

[ApiController]

[Route("api/[controller]")]

public class EmployeeLeaveController : ControllerBase

{

    private readonly IEmployeeLeaveService _service;

    public EmployeeLeaveController(IEmployeeLeaveService service)

    {

        _service = service;

    }

    // Employee applies leave

    [HttpPost]

    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto)

    {

        return await _service.ApplyLeave(dto, User);

    }

    // Employee sees their leaves

    [HttpGet]

    public async Task<IActionResult> GetMyLeaves()

    {

        return await _service.GetMyLeaves(User);

    }

    // 🔹 Admin Leave Management Screen (NEW)

    [HttpGet("all")]

    public async Task<IActionResult> GetAllLeaves()

    {

        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        

        return await _service.GetAllLeaves();

    }

    [HttpPut("approve-reject/{id}")]
    public async Task<IActionResult> ApproveOrRejectLeave(
       int id,
       [FromQuery] string status)
    {
        return await _service.UpdateStatus(id, status, User);
    }

    // Employee leave balance

    [HttpGet("balance")]

    public async Task<IActionResult> GetBalance()

    {

        return await _service.GetBalance(User);

    }

    // Admin approves/rejects leave

    [HttpPut("update-status/{id}")]
    public async Task<IActionResult> UpdateStatus(
    int id,
    [FromQuery] string status)
    {
        return await _service.UpdateStatus(id, status, User);
    }

    // Delete leave

    [HttpDelete("{id}")]

    public async Task<IActionResult> Delete(int id)

    {

        return await _service.Delete(id);

    }

    // Employee cancels leave

    [HttpPut("cancel/{id}")]

    public async Task<IActionResult> CancelLeave(int id)

    {

        return await _service.CancelLeave(id, User);

    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportLeaves()
    {
        var fileBytes = await _service.ExportLeavesExcel();

        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"EmployeeLeaves_{DateTime.Now:yyyyMMddHHmmss}.xlsx"
        );
    }

}
