using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;
using EmployeeManagementSystem.DTOs;


public interface IEmployeeLeaveService

{

    Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto, ClaimsPrincipal user);

    Task<IActionResult> GetMyLeaves(ClaimsPrincipal user);

    Task<IActionResult> GetAllLeaves(ClaimsPrincipal user);

    Task<IActionResult> CancelLeave(int id, ClaimsPrincipal user);

    //Task<IActionResult> GetBalance(ClaimsPrincipal user);
    Task<IActionResult> UpdateStatus(
        LeaveApprovalDto dto,
        ClaimsPrincipal user);
    Task<IActionResult> Delete(int id, ClaimsPrincipal user);

    Task<IActionResult> GetEmployeeLeaveDetails(string employeeId, ClaimsPrincipal user);

    Task<byte[]> ExportLeavesExcel(ClaimsPrincipal user);

    Task<IActionResult> ApplyWFH(WorkFromHomeDto dto, ClaimsPrincipal user);

    Task<IActionResult> GetAllWFH(ClaimsPrincipal user);

    Task<IActionResult> GetMyWFH(ClaimsPrincipal user);
    Task<IActionResult> MailAction(
int leaveId,
string action,
string token,
string approverEmail);
    Task<IActionResult> UpdateWFHStatus(
     int id,
     string status,
     string? approvalRemark,
     ClaimsPrincipal user);
    Task<IActionResult> CancelWFH(
    int id,
    ClaimsPrincipal user);

    Task<IActionResult> WFHMailAction(
       int requestId,
       string action,
       string token,
       string approverEmail);

}
