using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
   
    public class ShiftSwapController : ControllerBase
    {
        private readonly IShiftSwapService _service;

        public ShiftSwapController(IShiftSwapService service)
        {
            _service = service;
        }

        [HttpGet]

        public async Task<IActionResult> GetAll(

       [FromQuery] string? type,

       [FromQuery] string? status,

       [FromQuery] bool? forAdmin,

       [FromQuery] string? role,

       [FromQuery] bool includePendingEmployee = false)

        {

            var jwtRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value

                ?? User.FindFirst("Role")?.Value

                ?? User.FindFirst("role")?.Value;

            var jwtEmployeeId = User.FindFirst("EmployeeId")?.Value

                ?? User.FindFirst("Employee_Id")?.Value;

            // =========================================================================

            // 1. EMPLOYEE FLOW (Token has EmployeeId)

            // =========================================================================

            // Filters strictly by their EmployeeId: only requests they sent or received

            if (!string.IsNullOrWhiteSpace(jwtEmployeeId))

            {

                var employeeData = await _service.GetAllAsync(

                    employeeId: jwtEmployeeId,

                    type: type,

                    status: status,

                    forAdmin: false,

                    role: jwtRole ?? "Employee",

                    includePendingEmployee: includePendingEmployee

                );

                return Ok(employeeData);

            }

            // =========================================================================

            // 2. ADMIN / MANAGER FLOW (Token has no EmployeeId, but Role is Admin)

            // =========================================================================

            bool isAdmin = string.Equals(jwtRole, "Admin", StringComparison.OrdinalIgnoreCase)

                        || string.Equals(jwtRole, "Manager", StringComparison.OrdinalIgnoreCase)

                        || string.Equals(jwtRole, "SuperAdmin", StringComparison.OrdinalIgnoreCase)

                        || User.IsInRole("Admin")

                        || User.IsInRole("Manager")

                        || User.IsInRole("SuperAdmin");

            if (isAdmin)

            {

                var adminData = await _service.GetAllAsync(

                    employeeId: null,

                    type: type,

                    status: status,

                    forAdmin: true,

                    role: jwtRole ?? "Admin",

                    includePendingEmployee: includePendingEmployee

                );

                return Ok(adminData);

            }

            // =========================================================================

            // 3. NEITHER EMPLOYEE ID NOR ADMIN ROLE FOUND

            // =========================================================================

            return Unauthorized(new

            {

                Success = false,

                Message = "EmployeeId not found in JWT token."

            });

        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var data = await _service.GetByIdAsync(id);

            if (data == null)
                return NotFound(new { Success = false, Message = $"Shift swap request with ID {id} was not found." });

            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> RequestSwap([FromBody] CreateShiftSwapDto dto)
        {
            var loggedInUser = User.FindFirst("EmployeeId")?.Value
     ?? User.FindFirst("Employee_Id")?.Value;

            if (string.IsNullOrWhiteSpace(loggedInUser))
            {
                return Unauthorized(new
                {
                    Success = false,
                    Message = "EmployeeId not found in JWT token."
                });
            }

            var result = await _service.RequestSwapDetailedAsync(dto, loggedInUser);

            if (!result.Success)
                return BadRequest(new { Success = false, Message = result.Message });

            return Ok(new { Success = true, Message = result.Message });
        }

        // ==========================================
        // STAGE 1: EMPLOYEE ACCEPT / REJECT
        // ==========================================

        // PUT /api/ShiftSwap/{id}/employee-accept OR POST /api/ShiftSwap/{id}/employee-accept
        [Authorize]
        [HttpPut("{id}/employee-accept")]
        [HttpPost("{id}/employee-accept")]
        public async Task<IActionResult> EmployeeAccept(
     int id,
     [FromBody] ApproveShiftSwapDto? dto)
        {
            var user = User.FindFirst("EmployeeId")?.Value
                ?? User.FindFirst("Employee_Id")?.Value;

            if (string.IsNullOrWhiteSpace(user))
            {
                return Unauthorized(new
                {
                    Success = false,
                    Message = "EmployeeId not found in JWT token."
                });
            }

            var result = await _service.EmployeeAcceptSwapDetailedAsync(id, user);

            if (!result.Success)
            {
                if (result.Message.Contains(
                    "not found",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = result.Message,
                        CurrentStatus = result.CurrentStatus,
                        SwapId = id
                    });
                }

                return BadRequest(new
                {
                    Success = false,
                    Message = result.Message,
                    CurrentStatus = result.CurrentStatus,
                    SwapId = id
                });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }
        // PUT /api/ShiftSwap/{id}/employee-reject OR POST /api/ShiftSwap/{id}/employee-reject
        [Authorize]
        [HttpPut("{id}/employee-reject")]
        [HttpPost("{id}/employee-reject")]
        public async Task<IActionResult> EmployeeReject(
         int id,
         [FromBody] RejectRequestDto? dto,
         [FromQuery] string? remarks)
        {
            var reason = dto?.ResolvedRemarks ?? remarks;

            var user = User.FindFirst("EmployeeId")?.Value
                ?? User.FindFirst("Employee_Id")?.Value;

            if (string.IsNullOrWhiteSpace(user))
            {
                return Unauthorized(new
                {
                    Success = false,
                    Message = "EmployeeId not found in JWT token."
                });
            }

            var result = await _service.EmployeeRejectSwapDetailedAsync(
                id,
                reason,
                user);

            if (!result.Success)
            {
                if (result.Message.Contains(
                    "not found",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(new
                    {
                        Success = false,
                        Message = result.Message,
                        CurrentStatus = result.CurrentStatus,
                        SwapId = id
                    });
                }

                return BadRequest(new
                {
                    Success = false,
                    Message = result.Message,
                    CurrentStatus = result.CurrentStatus,
                    SwapId = id
                });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }     // ==========================================
        // STAGE 2: ADMIN / MANAGER APPROVE / REJECT
        // ==========================================

        // PUT /api/ShiftSwap/{id}/admin-approve OR POST /api/ShiftSwap/{id}/admin-approve
        [HttpPut("{id}/admin-approve")]
        [HttpPost("{id}/admin-approve")]
        public async Task<IActionResult> AdminApprove(int id, [FromQuery] string? approvedBy, [FromBody] ApproveShiftSwapDto? dto)
        {
            var approver = approvedBy
                ?? dto?.ApprovedBy
                ?? dto?.ResolvedUser
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value
                ?? "Admin";

            var result = await _service.AdminApproveSwapDetailedAsync(id, approver);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }

        // PUT /api/ShiftSwap/{id}/admin-reject OR POST /api/ShiftSwap/{id}/admin-reject
        [HttpPut("{id}/admin-reject")]
        [HttpPost("{id}/admin-reject")]
        public async Task<IActionResult> AdminReject(int id, [FromBody] RejectRequestDto? dto, [FromQuery] string? remarks, [FromQuery] string? rejectedBy)
        {
            var reason = dto?.ResolvedRemarks ?? remarks;
            var adminUser = dto?.ResolvedUser
                ?? rejectedBy
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value
                ?? "Admin";

            var result = await _service.AdminRejectSwapDetailedAsync(id, reason, adminUser);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }

        // ==========================================
        // SMART ACCEPT / REJECT (Auto-Detects State)
        // ==========================================

        // PUT /api/ShiftSwap/{id}/accept OR POST /api/ShiftSwap/{id}/accept
        [HttpPut("{id}/accept")]
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> Accept(int id, [FromQuery] string? approvedBy, [FromBody] ApproveShiftSwapDto? dto)
        {
            var user = approvedBy
                ?? dto?.ApprovedBy
                ?? dto?.ResolvedUser
                ?? User.FindFirst("EmployeeId")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value;

            var result = await _service.AcceptSwapDetailedAsync(id, user);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }

        // PUT /api/ShiftSwap/{id}/reject OR POST /api/ShiftSwap/{id}/reject
        [HttpPut("{id}/reject")]
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectRequestDto? dto, [FromQuery] string? remarks, [FromQuery] string? rejectedBy)
        {
            var reason = dto?.ResolvedRemarks ?? remarks;
            var user = dto?.ResolvedUser
                ?? rejectedBy
                ?? User.FindFirst("EmployeeId")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value;

            var result = await _service.RejectSwapDetailedAsync(id, reason, user);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = id });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = id
            });
        }

        // ==========================================
        // BODY-BASED GENERIC APPROVE / REJECT
        // ==========================================

        // POST /api/ShiftSwap/approve
        [HttpPost("approve")]
        public async Task<IActionResult> ApproveSwap([FromBody] ApproveShiftSwapDto? dto, [FromQuery] int? swapId, [FromQuery] int? id)
        {
            int targetId = dto?.ResolvedSwapId ?? swapId ?? id ?? 0;
            if (targetId <= 0)
            {
                return BadRequest(new { Success = false, Message = "SwapId is required in the request body (e.g. { \"swapId\": 15 }) or query string." });
            }

            bool isApprove = dto?.ResolvedIsApprove ?? true;
            string approver = dto?.ResolvedUser
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value
                ?? "Admin";

            var result = isApprove
                ? await _service.AcceptSwapDetailedAsync(targetId, approver)
                : await _service.RejectSwapDetailedAsync(targetId, dto?.ResolvedRemarks, approver);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = targetId });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = targetId });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = targetId
            });
        }

        // POST /api/ShiftSwap/reject
        [HttpPost("reject")]
        public async Task<IActionResult> RejectSwap([FromBody] RejectRequestDto? dto, [FromQuery] int? swapId, [FromQuery] int? id)
        {
            int targetId = dto?.ResolvedId ?? swapId ?? id ?? 0;
            if (targetId <= 0)
            {
                return BadRequest(new { Success = false, Message = "SwapId is required in the request body (e.g. { \"swapId\": 15 }) or query string." });
            }

            string? remarks = dto?.ResolvedRemarks;
            string rejecter = dto?.ResolvedUser
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                ?? User.FindFirst("Name")?.Value
                ?? "Admin";

            var result = await _service.RejectSwapDetailedAsync(targetId, remarks, rejecter);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                    return NotFound(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = targetId });

                return BadRequest(new { Success = false, Message = result.Message, CurrentStatus = result.CurrentStatus, SwapId = targetId });
            }

            return Ok(new
            {
                Success = true,
                Message = result.Message,
                CurrentStatus = result.CurrentStatus,
                SwapId = targetId
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);

            if (!result)
                return NotFound(new { Success = false, Message = "Shift swap request not found or already approved." });

            return Ok(new { Success = true, Message = "Shift swap deleted successfully." });
        }
    }
}