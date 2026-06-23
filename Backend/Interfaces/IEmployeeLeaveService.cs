using Microsoft.AspNetCore.Mvc;

using System.Security.Claims;

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
    Task<byte[]> ExportLeavesExcel();

}
