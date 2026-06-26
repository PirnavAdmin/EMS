using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;
using EmployeeManagementSystem.DTOs;


public interface IEmployeeLeaveService

{

    Task<IActionResult> ApplyLeave(EmployeeLeaveDto dto, ClaimsPrincipal user);

    Task<IActionResult> GetMyLeaves(ClaimsPrincipal user);

    Task<IActionResult> GetAllLeaves();

    Task<IActionResult> CancelLeave(int id, ClaimsPrincipal user);

    Task<IActionResult> GetBalance(ClaimsPrincipal user);

    Task<IActionResult> UpdateStatus(
        int id,
        string status,
        ClaimsPrincipal user);
    Task<IActionResult> Delete(int id);

    Task<IActionResult> GetEmployeeLeaveDetails(string employeeId);

    Task<byte[]> ExportLeavesExcel();

    Task<IActionResult> ApplyWFH(WorkFromHomeDto dto, ClaimsPrincipal user);

    Task<IActionResult> GetAllWFH();

    Task<IActionResult> GetMyWFH(ClaimsPrincipal user);
    Task<IActionResult> MailAction(
int leaveId,
string action,
string token,
string approverEmail);
    Task<IActionResult> UpdateWFHStatus(
        int id,
        string status,
        ClaimsPrincipal user);
    Task<IActionResult> CancelWFH(
    int id,
    ClaimsPrincipal user);


}
