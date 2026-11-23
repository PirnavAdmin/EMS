using DocumentFormat.OpenXml.Spreadsheet;
using EmployeeManagementSystem.Authorization;
using EmployeeManagementSystem.Constants;
using EmployeeManagementSystem.Data;
using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces; // varsha
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

// varsha - EmployeeLeaveController with complete Audit Logging
[ApiController]
[Route("api/[controller]")]
public class EmployeeLeaveController : ControllerBase
{
    private readonly IEmployeeLeaveService _service;
    private readonly IAuditLogService _auditLogService; // varsha
    private readonly AppDbContext _context; // varsha - DB context for capturing pre-update state

    public EmployeeLeaveController(
        IEmployeeLeaveService service,
        IAuditLogService auditLogService,
        AppDbContext context) // varsha
    {
        _service = service;
        _auditLogService = auditLogService; // varsha
        _context = context; // varsha
    }

    // Employee applies leave

    //[Authorize]
    //[Permission(ModuleIds.UserLeaveManagement, PermissionAction.Add)]
    [HttpPost]
    public async Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto)
    {
        var result = await _service.ApplyLeave(dto, User);

        // varsha - Audit leave application
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            var empId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "N/A";
            await _auditLogService.LogCreateAsync(
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: empId,
                description: $"Applied for leave from {dto.FromDate:yyyy-MM-dd} to {dto.ToDate:yyyy-MM-dd} ({dto.LeaveType})",
                newValues: new { dto.LeaveType, dto.FromDate, dto.ToDate, dto.Reason, dto.AppliedDate },
                user: User);
        }

        return result;
    }

    // Employee sees their leaves
    //[Authorize]
    //[Permission(ModuleIds.UserLeaveManagement, PermissionAction.View)]
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

        

        return await _service.GetAllLeaves(User);


    }

    //[Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.Edit)]
    [HttpPut("approve-reject/{id}")]
    public async Task<IActionResult> ApproveOrRejectLeave(
        int id,
        [FromQuery] string status,
        [FromQuery] string? approvalRemark)
    {
        // varsha - Capture existing leave state before approval/rejection
        var existingLeave = await _context.EmployeeLeaves.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        var oldValues = existingLeave != null ? new
        {
            existingLeave.Status,
            existingLeave.ApprovalRemarks
        } : null;

        var dto = new LeaveApprovalDto
        {
            RequestId = id,
            Decision = status,
            ApprovalRemark = approvalRemark
        };

        var result = await _service.UpdateStatus(dto, User);

        // varsha - Audit leave approval / rejection with delta
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            await _auditLogService.LogUpdateAsync(
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: id.ToString(),
                description: $"Leave request {id} status changed from '{existingLeave?.Status}' to '{status}'. Remark: {approvalRemark ?? "None"}",
                oldValues: oldValues,
                newValues: dto,
                user: User);
        }

        return result;
    }

    // Admin approves/rejects leave
    [HttpPut("update-status/{id}")]
    public async Task<IActionResult> UpdateStatus(
      int id,
      [FromQuery] string status)
    {
        // varsha - Capture existing leave state before status update
        var existingLeave = await _context.EmployeeLeaves.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        var oldValues = existingLeave != null ? new
        {
            existingLeave.Status,
            existingLeave.ApprovalRemarks
        } : null;

        var dto = new LeaveApprovalDto
        {
            RequestId = id,
            Decision = status
        };

        var result = await _service.UpdateStatus(dto, User);

        // varsha - Audit leave status modification with delta
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            await _auditLogService.LogUpdateAsync(
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: id.ToString(),
                description: $"Leave request {id} status changed from '{existingLeave?.Status}' to '{status}'",
                oldValues: oldValues,
                newValues: dto,
                user: User);
        }

        return result;
    }

    // Delete leave
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        // varsha - Capture existing leave state before deletion
        var existingLeave = await _context.EmployeeLeaves.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        var oldValues = existingLeave != null ? new
        {
            existingLeave.Id,
            existingLeave.EmployeeId,
            existingLeave.LeaveType,
            existingLeave.Status
        } : null;

        var result = await _service.Delete(id, User);

        // varsha - Audit leave deletion
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            await _auditLogService.LogDeleteAsync(
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: id.ToString(),
                description: $"Deleted leave request {id}",
                oldValues: oldValues,
                user: User);
        }

        return result;
    }

    // Employee cancels leave
    [HttpPut("cancel/{id}")]
    public async Task<IActionResult> CancelLeave(int id)
    {
        var result = await _service.CancelLeave(id, User);

        // varsha - Audit leave cancellation
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            await _auditLogService.LogActionAsync(
                action: "CancelLeave",
                module: "LeaveManagement",
                entityName: "EmployeeLeave",
                entityId: id.ToString(),
                description: $"Cancelled leave request {id}",
                statusCode: 200,
                user: User);
        }

        return result;
    }

    [HttpGet("employee-leave-details/{employeeId}")]
    public async Task<IActionResult> GetEmployeeLeaveDetails(string employeeId)
    {
        return await _service.GetEmployeeLeaveDetails(employeeId, User);
    }

    //[Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.View)]
    [HttpGet("export")]
    public async Task<IActionResult> ExportLeaves()
    {
        var fileBytes = await _service.ExportLeavesExcel(User);

        return File(
            fileBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"EmployeeLeaves_{DateTime.Now:yyyyMMddHHmmss}.xlsx"
        );
    }


    //[Authorize]
    //[Permission(ModuleIds.UserLeaveManagement, PermissionAction.Add)]

    [HttpPost("apply-wfh")]
    public async Task<IActionResult> ApplyWFH(
    [FromForm] WorkFromHomeDto dto)
    {
        var result = await _service.ApplyWFH(dto, User);

        // varsha - Audit WFH application
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            var empId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "N/A";
            await _auditLogService.LogCreateAsync(
                module: "WorkFromHome",
                entityName: "WorkFromHomeRequest",
                entityId: empId,
                description: $"Applied for WFH from {dto.FromDate:yyyy-MM-dd} to {dto.ToDate:yyyy-MM-dd}",
                newValues: new { dto.LeaveType, dto.FromDate, dto.ToDate, dto.Reason },
                user: User);
        }

        return result;
    }


    //[Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.View)]
    [HttpGet("all-wfh")]

    public async Task<IActionResult> GetAllWFH()

    {

        return await _service.GetAllWFH(User);

    }

    //[Authorize]
    //[Permission(ModuleIds.UserLeaveManagement, PermissionAction.View)]

    [HttpGet("my-wfh")]

    public async Task<IActionResult> GetMyWFH()

    {

        return await _service.GetMyWFH(User);

    }

    //[Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.Edit)]
    [HttpPut("update-wfh-status/{id}")]
    public async Task<IActionResult> UpdateWFHStatus(
     int id,
     [FromQuery] string status,
     [FromQuery] string? approvalRemark)
    {
        // varsha - Capture existing WFH state before status update
        var existingWFH = await _context.WorkFromHomeRequests.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
        var oldValues = existingWFH != null ? new
        {
            existingWFH.Status,
            existingWFH.ApprovalRemarks
        } : null;

        var result = await _service.UpdateWFHStatus(
            id,
            status,
            approvalRemark,
            User);

        // varsha - Audit WFH status update (approval / rejection) with delta
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            var newValues = new
            {
                Status = status,
                ApprovalRemark = approvalRemark
            };

            await _auditLogService.LogUpdateAsync(
                module: "WorkFromHome",
                entityName: "WorkFromHomeRequest",
                entityId: id.ToString(),
                description: $"WFH request {id} was {status}. Remark: {approvalRemark ?? "None"}",
                oldValues: oldValues,
                newValues: newValues,
                user: User);
        }

        return result;
    }

    //[Authorize]
    //[Permission(ModuleIds.UserLeaveManagement, PermissionAction.Edit)]
    [HttpPut("cancel-wfh/{id}")]

    public async Task<IActionResult> CancelWFH(int id)

    {

        var result = await _service.CancelWFH(id, User);

        // varsha - Audit WFH cancellation
        if (result is OkObjectResult or ObjectResult { StatusCode: null or >= 200 and < 300 })
        {
            await _auditLogService.LogActionAsync(
                action: "CancelWFH",
                module: "WorkFromHome",
                entityName: "WorkFromHomeRequest",
                entityId: id.ToString(),
                description: $"Cancelled WFH request {id}",
                statusCode: 200,
                user: User);
        }

        return result;

    }
    //[Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.Edit)]

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

    //    [Authorize]
    //[Permission(ModuleIds.LeaveManagement, PermissionAction.Edit)]
    [HttpGet("wfh-mail-action")]
    [HttpGet("~/api/WorkFromHome/mail-action")]
    public async Task<IActionResult> WFHMailAction(
        int requestId,
        string action,
        string token,
        string approverEmail)
    {
        return await _service.WFHMailAction(
            requestId,
            action,
            token,
            approverEmail);
    }
}
