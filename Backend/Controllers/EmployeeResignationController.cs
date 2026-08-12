using EmployeeManagementSystem.DTOs;
using EmployeeManagementSystem.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManagementSystem.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeResignationController : ControllerBase
    {
        private readonly IEmployeeResignationService _service;

        public EmployeeResignationController(IEmployeeResignationService service)
        {
            _service = service;
        }

        // Apply Resignation
        [HttpPost("apply")]
        public async Task<IActionResult> ApplyResignation(CreateResignationDto dto)
        {
            var result = await _service.ApplyResignation(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Resignation already exists or employee not found."
                });

            return Ok(new
            {
                Success = true,
                Message = "Resignation submitted successfully."
            });
        }

        // Update Resignation
        [HttpPut("update")]
        public async Task<IActionResult> UpdateResignation(UpdateResignationDto dto)
        {
            var result = await _service.UpdateResignation(dto);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to update resignation."
                });

            return Ok(new
            {
                Success = true,
                Message = "Resignation updated successfully."
            });
        }

        // Delete Resignation
        [HttpDelete("{resignationId}")]
        public async Task<IActionResult> Delete(int resignationId)
        {
            var result = await _service.DeleteResignation(resignationId);

            if (!result)
                return BadRequest(new
                {
                    Success = false,
                    Message = "Unable to delete resignation."
                });

            return Ok(new
            {
                Success = true,
                Message = "Resignation deleted successfully."
            });
        }

        // Get All
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAll();
            return Ok(data);
        }

        // Get By Id
        [HttpGet("{resignationId}")]
        public async Task<IActionResult> GetById(int resignationId)
        {
            var data = await _service.GetById(resignationId);

            if (data == null)
                return NotFound();

            return Ok(data);
        }

        // Employee History
        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeeHistory(string employeeId)
        {
            var data = await _service.GetByEmployee(employeeId);
            return Ok(data);
        }

        // Pending Manager Approvals
        [HttpGet("pending-manager")]
        public async Task<IActionResult> PendingManager()
        {
            var data = await _service.GetPendingManagerApprovals();
            return Ok(data);
        }

        // Manager Approval
        [HttpPut("manager-approval")]
        public async Task<IActionResult> ManagerApproval(ManagerApprovalDto dto)
        {
            var result = await _service.ManagerApproval(dto);

            if (!result)
                return BadRequest();

            return Ok(new
            {
                Success = true,
                Message = "Manager approval completed."
            });
        }

        // Pending HR Approvals
        [HttpGet("pending-hr")]
        public async Task<IActionResult> PendingHR()
        {
            var data = await _service.GetPendingHRApprovals();
            return Ok(data);
        }

        // HR Approval
        [HttpPut("hr-approval")]
        public async Task<IActionResult> HRApproval(HRApprovalDto dto)
        {
            var result = await _service.HRApproval(dto);

            if (!result)
                return BadRequest();

            return Ok(new
            {
                Success = true,
                Message = "HR approval completed."
            });
        }
    }
}