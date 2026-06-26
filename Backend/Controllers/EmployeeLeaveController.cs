using DocumentFormat.OpenXml.Spreadsheet;

using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;
using EmployeeManagementSystem.DTOs;



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
    [Authorize]
    [HttpPost]

    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto)

    {

        return await _service.ApplyLeave(dto, User);

    }

    // Employee sees their leaves
    [Authorize]
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

    [HttpGet("employee-leave-details/{employeeId}")]
    public async Task<IActionResult> GetEmployeeLeaveDetails(string employeeId)
    {
        return await _service.GetEmployeeLeaveDetails(employeeId);
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


    [Authorize]

    [HttpPost("apply-wfh")]

    public async Task<IActionResult> ApplyWFH(

WorkFromHomeDto dto)

    {

        return await _service.ApplyWFH(dto, User);

    }

    [Authorize]

    [HttpGet("all-wfh")]

    public async Task<IActionResult> GetAllWFH()

    {

        return await _service.GetAllWFH();

    }

    [Authorize]

    [HttpGet("my-wfh")]

    public async Task<IActionResult> GetMyWFH()

    {

        return await _service.GetMyWFH(User);

    }

    [Authorize]

    [HttpPut("update-wfh-status/{id}")]

    public async Task<IActionResult> UpdateWFHStatus(

        int id,

        [FromQuery] string status)

    {

        return await _service.UpdateWFHStatus(

            id,

            status,

            User);

    }

    [Authorize]

    [HttpPut("cancel-wfh/{id}")]

    public async Task<IActionResult> CancelWFH(int id)

    {

        return await _service.CancelWFH(id, User);

    }

    [HttpGet("mail-action")]
    public async Task<IActionResult> MailAction(
int leaveId,
string action,
string token,
string approverEmail)
    {
        return await _service.MailAction(
            leaveId,
            action,
            token,
            approverEmail);
    }

}
